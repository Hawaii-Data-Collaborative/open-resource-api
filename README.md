Cloned from https://github.com/211-Connect/open-resource-api.

## Development

### Setup

Clone the repo, run `npm i`, run `npx prisma generate`.

`cp .env.example .env` then edit accordingly.

### Running

Open a terminal, run `npm run watch` to start the typescript compiler.
Open another terminal, run `npm run dev` to start the server.

### Build and deploy

Run `./build.sh` to compile and zip the code. Run `./deploy.sh` to copy the
dist files to the production machine then execute commands to update and restart the
production server.

NOTE: `./deploy.sh` assumes you have an entry called `auw1` in your `~/.ssh/config` file.

## License

Copyright (C) 2021 Connect 211

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>
