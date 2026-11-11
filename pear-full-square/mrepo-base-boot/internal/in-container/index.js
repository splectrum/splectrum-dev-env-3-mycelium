// inContainer(): whether this process runs in a container (README.md beside it).
import { existsSync, readFileSync } from 'bare-fs'

export const inContainer = () => existsSync('/.dockerenv') ||
  (() => { try { return /docker|containerd|kubepods|libpod|lxc/.test(readFileSync('/proc/1/cgroup', 'utf8')) } catch { return false } })()
