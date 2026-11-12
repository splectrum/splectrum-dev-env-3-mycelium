// base-package-service's protocol: service, the service state of an mrepo's
// external API. Linked into an mrepo, its config is loaded by the runtime
// and its actions run; its structure part brings the state, booted.
// The work and the config are mrepo-base-service's; here the mounting.
import { initialise, start, stop, shutdown, CONFIG } from './modules/pear-full-square/mrepo-base-service/index.js'

export const protocols = {
  service: { package: 'haiccing/base-package-service', ...CONFIG }
}

export const actions = {
  service: { initialise, start, stop, shutdown }
}
