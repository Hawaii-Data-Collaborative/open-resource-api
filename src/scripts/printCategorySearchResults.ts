import * as querystring from 'query-string'
import { CategoryService, SearchService } from '../services'

async function main() {
  const categoryService = new CategoryService()
  const searchService = new SearchService()
  const parents = await categoryService.getCategories()
  const trim = (str: string) => str.replace(/\n/g, ' ').trim()
  for (const parent of parents) {
    for (const child of parent.children) {
      const params = querystring.parse(child.params)
      const results = await searchService.search({ taxonomies: params.taxonomies as string })
      console.log(
        `${parent.name} – ${child.name}:\n  ${results
          .map(
            (r: any) =>
              `${r._source.location_name} at ${r._source.service_name}\n    ${trim(
                r._source.service_short_description as string
              )}`
          )
          .join('\n  ')}`
      )
    }
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
