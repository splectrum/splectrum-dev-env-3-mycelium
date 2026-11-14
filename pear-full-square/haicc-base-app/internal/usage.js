// The app's usage: the commands it answers (haicc --help).
export const USAGE = `haicc <URI> <protocol>/<action> <argument>...   a command for the mrepos:
                                                go to this node position and
                                                execute the command that
                                                follows; its response record
                                                printed, unpacked across lines
haicc --raw <URI> <protocol>/<action> ...       the record as it is stored,
                                                one line
haicc --output <URI> <protocol>/<action> ...    the completed form's output
                                                alone
haicc boot/deploy                               the machine level: the boot
                                                mrepo put in place at the
                                                root, its runtime started
haicc boot/teardown                             every runtime stopped, what
                                                boot/deploy put in place removed
haicc sources                                   the sources registered
haicc sources unlink <folder>
haicc sources download [<what>...]              fetched over https: <org>,
                                                <org>/<package>
haicc sources https | no-https                  https as the backup, or not

  haicc boot/deploy
  haicc / boot/deploy host base-component-haicc
  haicc /host service/initialise
  haicc /host service/start
  haicc /host boot/deploy node-1 base-package-runtime
  haicc /host haicc /node-1 help/get /
  haicc /host boot/teardown node-1
  haicc / boot/teardown host
  haicc boot/teardown

Help in an mrepo: haicc / help/get /, haicc /host help/get /protocols`
