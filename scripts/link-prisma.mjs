import { existsSync, lstatSync, readlinkSync, realpathSync, rmSync, symlinkSync } from "node:fs"
import { dirname, join, relative } from "node:path"

const clientPackage = realpathSync(join("node_modules", "@prisma", "client"))
const generated = realpathSync(join(dirname(clientPackage), "..", ".prisma"))
const types = join(generated, "client", "index.d.ts")

if (!existsSync(types)) {
  throw new Error("Prisma Client types were not generated. Run prisma generate first.")
}

const link = join("node_modules", ".prisma")
const target = relative(dirname(link), generated)

if (existsSync(link)) {
  const stat = lstatSync(link)
  if (stat.isSymbolicLink() && readlinkSync(link) === target) {
    process.exit(0)
  }
  rmSync(link, { recursive: true, force: true })
}

symlinkSync(target, link, "dir")
