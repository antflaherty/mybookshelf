// Package apierr builds every non-2xx HTTP response body in this API.
//
// The wire shape is:
//
//	{ "error": { "code": "...", "message": "...", "details": { ... } } }
//
// Handlers call Respond with either a typed *Error from one of the constructors
// below, or an arbitrary error (which Respond treats as an internal error).
package apierr

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Error codes. The status is derived from the code by the constructors below,
// so these constants are never paired with a status by hand.
const (
	CodeInvalidRequest      = "invalid_request"
	CodeUnauthorized        = "unauthorized"
	CodeInvalidCredentials  = "invalid_credentials"
	CodeBookNotFound        = "book_not_found"
	CodeShelfNotFound       = "shelf_not_found"
	CodeNotFound            = "not_found"
	CodeEmailTaken          = "email_taken"
	CodeInternal            = "internal_error"
	CodeUpstreamUnavailable = "upstream_unavailable"
)

// Messages that are safe to show a user and are asserted by tests. These two
// fixed messages must not drift.
const (
	MessageInternal = "internal server error"
	MessageUpstream = "book service unavailable"
)

// Body is the wire envelope: a single "error" object.
type Body struct {
	Error Payload `json:"error"`
}

// Payload is the inner "error" object.
type Payload struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Details map[string]string `json:"details,omitempty"`
}

// Error is an API-safe error carrying the status to respond with.
// cause holds the internal error for logging; it is never serialized.
//
// There is deliberately no exported way to construct an Error with a cause, so
// a caller cannot smuggle SQL or driver text into a response message.
type Error struct {
	Status  int
	Code    string
	Message string
	Details map[string]string
	cause   error
}

// Error returns the client-safe message. It never includes the cause.
func (e *Error) Error() string {
	return e.Message
}

// Unwrap exposes the internal cause to errors.Is and to Respond's log line.
func (e *Error) Unwrap() error {
	return e.cause
}

// withCause attaches an internal error for logging only.
func (e *Error) withCause(cause error) *Error {
	e.cause = cause
	return e
}

// InvalidRequest reports a body or query string that failed to bind or
// validate. details is required by the contract and maps field names to
// messages.
func InvalidRequest(details map[string]string) *Error {
	return &Error{
		Status:  http.StatusBadRequest,
		Code:    CodeInvalidRequest,
		Message: "invalid request",
		Details: details,
	}
}

// InvalidRequestf is InvalidRequest with an overridden message, for cases where
// one specific sentence is clearer than the generic one.
func InvalidRequestf(details map[string]string, msg string) *Error {
	err := InvalidRequest(details)
	err.Message = msg
	return err
}

// Unauthorized reports a missing Authorization header.
func Unauthorized() *Error {
	return &Error{
		Status:  http.StatusUnauthorized,
		Code:    CodeUnauthorized,
		Message: "authorization header required",
	}
}

// InvalidAuthorizationHeader reports a malformed Authorization header.
func InvalidAuthorizationHeader() *Error {
	return &Error{
		Status:  http.StatusUnauthorized,
		Code:    CodeUnauthorized,
		Message: "invalid authorization header",
	}
}

// InvalidToken reports an Authorization header that parsed but did not verify.
// It is a separate constructor from InvalidAuthorizationHeader only so the two
// contract §3 strings stay distinct; both carry the code "unauthorized".
func InvalidToken() *Error {
	return &Error{
		Status:  http.StatusUnauthorized,
		Code:    CodeUnauthorized,
		Message: "invalid or expired token",
	}
}

// InvalidCredentials reports a failed login. Deliberately non-specific so it
// cannot be used to enumerate accounts.
func InvalidCredentials() *Error {
	return &Error{
		Status:  http.StatusUnauthorized,
		Code:    CodeInvalidCredentials,
		Message: "invalid email or password",
	}
}

// BookNotFound reports an unknown book id. The id is echoed in details, which
// is safe: the caller supplied it.
func BookNotFound(id string) *Error {
	return notFoundWith(CodeBookNotFound, id)
}

// ShelfNotFound reports a shelf that does not exist or is not owned by the
// caller. Per contract §2 both cases are indistinguishable on the wire.
func ShelfNotFound(id string) *Error {
	return notFoundWith(CodeShelfNotFound, id)
}

// NotFound is the generic 404 for resources with no specific code.
func NotFound(what string) *Error {
	return notFoundWith(CodeNotFound, what)
}

func notFoundWith(code string, id string) *Error {
	err := &Error{
		Status:  http.StatusNotFound,
		Code:    code,
		Message: "not found",
	}
	if id != "" {
		err.Details = map[string]string{"id": id}
	}
	return err
}

// EmailTaken reports a registration attempt with an already-used email.
func EmailTaken() *Error {
	return &Error{
		Status:  http.StatusConflict,
		Code:    CodeEmailTaken,
		Message: "email already registered",
	}
}

// Internal reports an unexpected server failure. The message is fixed by the
// contract; only the cause varies and it goes to the logs.
func Internal(cause error) *Error {
	return (&Error{
		Status:  http.StatusInternalServerError,
		Code:    CodeInternal,
		Message: MessageInternal,
	}).withCause(cause)
}

// Upstream reports an Open Library failure: non-2xx, timeout, or unparseable
// JSON. The message is fixed by the contract; the cause goes to the logs.
func Upstream(cause error) *Error {
	return (&Error{
		Status:  http.StatusBadGateway,
		Code:    CodeUpstreamUnavailable,
		Message: MessageUpstream,
	}).withCause(cause)
}

// Respond writes err to the client and stops the handler chain.
//
// An *Error (or anything wrapping one) is sent as-is. Any other error is
// treated as Internal so an unclassified failure can never leak its text.
func Respond(c *gin.Context, err error) {
	var apiErr *Error

	if !errors.As(err, &apiErr) {
		apiErr = Internal(err)
	}

	logRequest(c, apiErr)

	c.AbortWithStatusJSON(apiErr.Status, Body{
		Error: Payload{
			Code:    apiErr.Code,
			Message: apiErr.Message,
			Details: apiErr.Details,
		},
	})

	// Abort only stops the handler chain; the current handler keeps running if
	// it forgets to return. Swapping in a discarding writer now, after the
	// envelope is on the wire, makes it the last thing written, so a stray
	// c.JSON after Respond cannot corrupt the JSON body the contract froze.
	c.Writer = &discardingWriter{ResponseWriter: c.Writer}

	c.Abort()
}

// discardingWriter drops writes made after an error response has already been
// written, while still reporting the original status and size.
type discardingWriter struct {
	gin.ResponseWriter
}

func (w *discardingWriter) Write(b []byte) (int, error) {
	return len(b), nil
}

func (w *discardingWriter) WriteString(s string) (int, error) {
	return len(s), nil
}

// logRequest supplements gin's own logger. The internal cause is logged here
// and never reaches the response body.
func logRequest(c *gin.Context, apiErr *Error) {
	attrs := []any{
		"status", apiErr.Status,
		"code", apiErr.Code,
		"method", c.Request.Method,
		"path", c.Request.URL.Path,
	}

	if cause := errors.Unwrap(apiErr); cause != nil {
		attrs = append(attrs, "cause", cause.Error())
	}

	slog.InfoContext(
		c.Request.Context(),
		"api error response",
		attrs...,
	)
}
