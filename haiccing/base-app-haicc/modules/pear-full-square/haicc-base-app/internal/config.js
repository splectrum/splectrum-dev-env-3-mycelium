// The app's config: what the haicc command is tied to.
//   org     the organisation its packages come from, in the sources
//   boot    the component the root mrepo is built from, run as a program
//   root    the root mrepo, the boot mrepo: its name in the work folder,
//           its unique URI (its inbox's topic)
//   reply   where a command's completed form is addressed back to
export const CONFIG = {
  org: 'haiccing',
  boot: 'base-component-boot',
  root: { name: 'boot', uri: 'local/boot' },
  reply: '/haicc/terminal'
}
