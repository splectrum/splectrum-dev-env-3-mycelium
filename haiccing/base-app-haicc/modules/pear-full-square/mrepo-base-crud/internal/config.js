// The crud protocol's config: create, read and delete, anywhere in main.
// create and delete need a target: the root is not made or removed. There
// is no update: asking for it is answered with the actions there are.
export const CONFIG = {
  description: 'An mrepo\'s nodes created, read and deleted by URI.',
  actions: {
    create: { uris: ['**'], target: true, args: ['value?'], description: 'A node made sure to exist, its parents too; its document the value given, {} when none. A node there already is left as it is.' },
    read: { uris: ['**'], description: 'The nodes a URI selects, each with its document and its children\'s names; a last name part of * selects the children.' },
    delete: { uris: ['**'], target: true, args: ['recurse?'], description: 'The nodes a URI selects made sure to be gone; one that has children only with recurse.' }
  }
}
