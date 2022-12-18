import Router from '@koa/router';
import { program, taxonomy } from '@prisma/client';
import meilisearch from '../../lib/meilisearch';
import prisma from '../../lib/prisma';

const router = new Router({
  prefix: '/search',
});

let taxonomiesByCode: any;
let taxonomiesByName: any;

/**
 * Build elasticsearch queries, filter out duplicates, and send back to client
 */
router.get('/', async (ctx) => {
  if (!taxonomiesByCode) {
    const arr = await prisma.taxonomy.findMany();
    taxonomiesByCode = {};
    taxonomiesByName = {};
    for (const t of arr) {
      taxonomiesByCode[t.Code__c] = t;
      taxonomiesByName[t.Name] = t;
    }
  }

  // const { taxonomies, lat, lon, radius } = ctx.query;
  const { taxonomies } = ctx.query;
  const q = (ctx.query.q as string)?.trim();
  // const { q, taxonomies, query_type, limit = 300, skip = 0, lat, lon, radius } = ctx.query;
  // const min_score = 3;
  // const queries = [];
  // const index = 'results';

  const results = [];
  let programs: program[];

  if (q) {
    const dbPrograms = await prisma.program.findMany({
      where: {
        OR: [
          { Name: { contains: q as string } },
          { AKA_Name__c: { contains: q as string } },
          { Description__c: { contains: q as string } },
          { Service_Description__c: { contains: q as string } },
        ],
      },
      take: 100
    });

    const res = await meilisearch.index('program').search(q, { limit: 100 })
    programs = res.hits as any

    console.log('q = %s', q)
    console.log('  db ids = %j', dbPrograms.map(p=>p.id))
    console.log('  ms ids = %j', programs.map(p=>p.id))
  } else {
    programs = await prisma.program.findMany();
  }

  let filteredPrograms: program[] = [];
  if (taxonomies) {
    const taxonomyCodes = (taxonomies as string).split(',').map((s) => s.trim());
    const filteredTaxonomies: taxonomy[] = [];
    for (const code of taxonomyCodes) {
      if (taxonomiesByCode[code]) {
        filteredTaxonomies.push(taxonomiesByCode[code]);
      }
    }

    const taxonomiesByName: any = {};
    for (const t of filteredTaxonomies) {
      taxonomiesByName[t.Name] = t;
    }

    for (const program of programs) {
      if (!program.Program_Taxonomies__c?.length) {
        continue;
      }
      const progTaxList = program.Program_Taxonomies__c.split(';').map((s) => s.trim());

      for (const progTaxName of progTaxList) {
        if (taxonomiesByName[progTaxName]) {
          filteredPrograms.push(program);
          break;
        }
      }
    }
  } else {
    filteredPrograms = programs;
  }

  const programIds = filteredPrograms.map((p) => p.id);
  const sitePrograms = await prisma.site_program.findMany({
    where: {
      Program__c: {
        in: programIds,
      },
    },
  });

  const siteIds = sitePrograms.map((sp) => sp.Site__c);
  const siteProgramMap: any = {};
  for (const sp of sitePrograms) {
    if (!siteProgramMap[sp.Program__c]) {
      siteProgramMap[sp.Program__c] = [];
    }
    siteProgramMap[sp.Program__c].push(sp);
  }

  const sites = await prisma.site.findMany({
    where: {
      id: {
        in: siteIds,
      },
    },
  });

  const siteMap: any = {};
  for (const s of sites) {
    siteMap[s.id] = s;
  }

  const agencyIds = filteredPrograms.map((p) => p.Account__c);
  const agencies = await prisma.agency.findMany({
    where: { id: { in: agencyIds } },
  });
  const agencyMap: any = {};
  for (const a of agencies) {
    agencyMap[a.id] = a.Name;
  }

  for (const p of filteredPrograms) {
    const spList = siteProgramMap[p.id];
    if (!spList?.length) {
      continue;
    }
    const site = siteMap[spList[0].Site__c];
    if (!site) {
      continue;
    }
    let physicalAddress = '';
    let locationLat = '';
    let locationLon = '';
    let street = site.Street_Number__c;
    if (street && site.City__c) {
      if (site.Suite__c) {
        street += ` ${site.Suite__c}`;
      }
      physicalAddress = street;
      if (site.Location__Latitude__s && site.Location__Longitude__s) {
        locationLat = site.Location__Latitude__s;
        locationLon = site.Location__Longitude__s;
      }
    }

    results.push({
      _source: {
        id: p.id, //
        service_name: p.Name, // - service_name, location_name, organization_name
        location_name: agencyMap[p.Account__c],
        physical_address: physicalAddress,
        physical_address_city: site.City__c,
        physical_address_state: site.State__c,
        physical_address_postal_code: site.Zip_Code__c,
        location_latitude: locationLat,
        location_longitude: locationLon,
        service_short_description: p.Service_Description__c, // - service_short_description
        phone: p.Program_Phone__c, //
        website: p.Website__c, //
      },
      _score: 1, //
    });
  }

  ctx.body = results;
});

export default router;
