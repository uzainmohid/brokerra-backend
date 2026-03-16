/**
 * Standard success response: { success: true, data, message }
 */
const ok = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data })

/**
 * Standard paginated response matching frontend PaginatedResponse<T>
 */
const paginated = (res, data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit)
  res.status(200).json({
    success: true,
    data,
    total,
    page,
    limit,
    totalPages,
  })
}

/**
 * Standard error response
 */
const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, message })

module.exports = { ok, paginated, fail }
