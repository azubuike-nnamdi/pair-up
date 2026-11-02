const PAGE_SIZES = [10, 25, 50]

export function tablePage(total: number, params: { page?: string; rows?: string }) {
  const rows = PAGE_SIZES.includes(Number(params.rows)) ? Number(params.rows) : 10
  const pageCount = Math.max(1, Math.ceil(total / rows))
  const requested = Math.max(1, Number(params.page) || 1)
  return { page: Math.min(requested, pageCount), rows }
}
