// storeOf(work): the work folder's package store (README.md beside it).
import { join } from 'bare-path'

export const storeOf = work => join(work, 'packages')
