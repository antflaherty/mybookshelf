package books

import "errors"

// Shared classification sentinels. books declares them so library, which
// already imports books, can alias them rather than the reverse, which would
// be an import cycle.
var (
	// ErrBookNotFound is returned when a book id is unknown to the `book`
	// table and by the Open Library client for an unknown work. Both mean
	// "no such book", and both map to 404 book_not_found.
	ErrBookNotFound = errors.New("book not found")

	// ErrUpstream is returned when Open Library fails: non-2xx, timeout, or a
	// 2xx body that will not parse. It maps to 502 upstream_unavailable.
	ErrUpstream = errors.New("open library request failed")
)

// IsNotFoundError reports whether err means "no such book".
func IsNotFoundError(err error) bool {
	return errors.Is(err, ErrBookNotFound)
}

// IsUpstreamError reports whether err came from Open Library failing.
func IsUpstreamError(err error) bool {
	return errors.Is(err, ErrUpstream)
}
