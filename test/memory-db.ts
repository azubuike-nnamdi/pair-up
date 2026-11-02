type Person = {
  id: string
  firstName: string
  lastName: string
  email: string
  gender: "MALE" | "FEMALE"
  status: "AVAILABLE" | "PENDING" | "ALLOCATED"
}

type Pocket = {
  id: string
  name: string
  type: "TYPE_1" | "TYPE_2" | "TYPE_3"
  gender: "MALE" | "FEMALE"
  status: "AVAILABLE" | "PENDING" | "BOOKED"
  deletedAt: Date | null
}

type Membership = {
  id: string
  personId: string
  pocketId: string
  role: "INITIATOR" | "PARTNER"
  status: "PENDING" | "APPROVED" | "DECLINED" | "RELEASED"
  activePersonKey: string | null
  joinedAt?: Date
}

type Store = {
  people: Person[]
  pockets: Pocket[]
  memberships: Membership[]
  invitations: Array<Record<string, unknown>>
  audits: Array<Record<string, unknown>>
}

const state: { store: Store } = { store: emptyStore() }

function emptyStore(): Store {
  return { people: [], pockets: [], memberships: [], invitations: [], audits: [] }
}

export function resetStore() {
  state.store = emptyStore()
}

export function memory() {
  return state.store
}

function matchesIn(value: string, filter: { in?: string[] } | string | undefined) {
  if (!filter) return true
  if (typeof filter === "string") return value === filter
  if (filter.in) return filter.in.includes(value)
  return true
}

type MemoryClient = {
  $queryRaw: () => Promise<unknown[]>
  $transaction: (run: (tx: MemoryClient) => Promise<unknown>) => Promise<unknown>
  person: {
    findUnique: (args: { where: { id?: string; email?: string } }) => Promise<Person | null>
    findMany: (args?: {
      where?: { id?: { in: string[] } }
      select?: { email: true }
    }) => Promise<Person[] | Array<{ email: string }>>
    update: (args: { where: { id: string }; data: Partial<Person> }) => Promise<Person>
    updateMany: (args: {
      where: { id: { in: string[] } }
      data: Partial<Person>
    }) => Promise<{ count: number }>
    create: (args: {
      data: Omit<Person, "id" | "status"> & { status?: Person["status"] }
    }) => Promise<Person>
  }
  pocket: {
    findFirst: (args: { where: { id: string; deletedAt: null } }) => Promise<Pocket | null>
    findMany: (args: {
      where: { gender: Pocket["gender"]; status: Pocket["status"]; deletedAt: null }
      orderBy?: { name: "asc" }
      include?: unknown
    }) => Promise<Array<Pocket & { _count: { memberships: number } }>>
    update: (args: { where: { id: string }; data: Partial<Pocket> }) => Promise<Pocket>
  }
  membership: {
    count: (args: {
      where: { pocketId: string; status: { in: Membership["status"][] } }
    }) => Promise<number>
    create: (args: { data: Omit<Membership, "id"> }) => Promise<Membership>
    findFirst: (args: {
      where: { personId: string; status: { in: Membership["status"][] } }
      include: { pocket: true }
    }) => Promise<(Membership & { pocket: Pocket | null }) | null>
    findMany: (args: {
      where: { pocketId: string; status: { in: Membership["status"][] } }
      select: { personId: true }
    }) => Promise<Array<{ personId: string }>>
    updateMany: (args: {
      where: { pocketId: string; status: { in: Membership["status"][] } }
      data: Partial<Membership>
    }) => Promise<{ count: number }>
  }
  invitation: {
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>
    updateMany: (args: {
      where: { pocketId: string; status: string }
      data: { status: string }
    }) => Promise<{ count: number }>
  }
  auditLog: {
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>
  }
}

export const prisma: MemoryClient = {
  async $queryRaw() {
    return []
  },
  $transaction(run) {
    return run(prisma)
  },
  person: {
    async findUnique({ where }: { where: { id?: string; email?: string } }) {
      return (
        state.store.people.find((person) =>
          where.id ? person.id === where.id : person.email === where.email
        ) ?? null
      )
    },
    async findMany(args?: {
      where?: { id?: { in: string[] } }
      select?: { email: true }
    }) {
      let people = state.store.people
      if (args?.where?.id?.in) {
        const ids = new Set(args.where.id.in)
        people = people.filter((person) => ids.has(person.id))
      }
      if (args?.select?.email) return people.map((person) => ({ email: person.email }))
      return people
    },
    async update({
      where,
      data,
    }: {
      where: { id: string }
      data: Partial<Person>
    }) {
      const person = state.store.people.find((item) => item.id === where.id)
      if (!person) throw new Error("Person not found")
      Object.assign(person, data)
      return person
    },
    async updateMany({
      where,
      data,
    }: {
      where: { id: { in: string[] } }
      data: Partial<Person>
    }) {
      const ids = new Set(where.id.in)
      const matches = state.store.people.filter((person) => ids.has(person.id))
      for (const person of matches) Object.assign(person, data)
      return { count: matches.length }
    },
    async create({ data }: { data: Omit<Person, "id" | "status"> & { status?: Person["status"] } }) {
      const person: Person = {
        id: `person-${state.store.people.length + 1}`,
        status: "AVAILABLE",
        ...data,
      }
      state.store.people.push(person)
      return person
    },
  },
  pocket: {
    async findFirst({ where }: { where: { id: string; deletedAt: null } }) {
      return (
        state.store.pockets.find(
          (pocket) => pocket.id === where.id && pocket.deletedAt === null
        ) ?? null
      )
    },
    async findMany({
      where,
    }: {
      where: { gender: Pocket["gender"]; status: Pocket["status"]; deletedAt: null }
      orderBy?: { name: "asc" }
      include?: unknown
    }) {
      return state.store.pockets
        .filter(
          (pocket) =>
            pocket.gender === where.gender &&
            pocket.status === where.status &&
            pocket.deletedAt === null
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((pocket) => ({
          ...pocket,
          _count: {
            memberships: state.store.memberships.filter(
              (membership) =>
                membership.pocketId === pocket.id &&
                (membership.status === "PENDING" || membership.status === "APPROVED")
            ).length,
          },
        }))
    },
    async update({
      where,
      data,
    }: {
      where: { id: string }
      data: Partial<Pocket>
    }) {
      const pocket = state.store.pockets.find((item) => item.id === where.id)
      if (!pocket) throw new Error("Pocket not found")
      Object.assign(pocket, data)
      return pocket
    },
  },
  membership: {
    async count({
      where,
    }: {
      where: { pocketId: string; status: { in: Membership["status"][] } }
    }) {
      return state.store.memberships.filter(
        (membership) =>
          membership.pocketId === where.pocketId && matchesIn(membership.status, where.status)
      ).length
    },
    async create({ data }: { data: Omit<Membership, "id"> }) {
      const membership: Membership = { id: `membership-${state.store.memberships.length + 1}`, ...data }
      state.store.memberships.push(membership)
      return membership
    },
    async findFirst({
      where,
    }: {
      where: { personId: string; status: { in: Membership["status"][] } }
      include: { pocket: true }
    }) {
      const membership = state.store.memberships.find(
        (item) => item.personId === where.personId && matchesIn(item.status, where.status)
      )
      if (!membership) return null
      const pocket = state.store.pockets.find((item) => item.id === membership.pocketId) ?? null
      return { ...membership, pocket }
    },
    async findMany({
      where,
    }: {
      where: { pocketId: string; status: { in: Membership["status"][] } }
      select: { personId: true }
    }) {
      return state.store.memberships
        .filter(
          (membership) =>
            membership.pocketId === where.pocketId && matchesIn(membership.status, where.status)
        )
        .map((membership) => ({ personId: membership.personId }))
    },
    async updateMany({
      where,
      data,
    }: {
      where: { pocketId: string; status: { in: Membership["status"][] } }
      data: Partial<Membership>
    }) {
      const matches = state.store.memberships.filter(
        (membership) =>
          membership.pocketId === where.pocketId && matchesIn(membership.status, where.status)
      )
      for (const membership of matches) Object.assign(membership, data)
      return { count: matches.length }
    },
  },
  invitation: {
    async create({ data }: { data: Record<string, unknown> }) {
      state.store.invitations.push({ status: "PENDING", ...data })
      return data
    },
    async updateMany({
      where,
      data,
    }: {
      where: { pocketId: string; status: string }
      data: { status: string }
    }) {
      const matches = state.store.invitations.filter(
        (invitation) => invitation.pocketId === where.pocketId && invitation.status === where.status
      )
      for (const invitation of matches) Object.assign(invitation, data)
      return { count: matches.length }
    },
  },
  auditLog: {
    async create({ data }: { data: Record<string, unknown> }) {
      state.store.audits.push(data)
      return data
    },
  },
}
