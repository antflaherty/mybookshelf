package apierr

import (
	"encoding/json"
	"errors"
	"reflect"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// BindJSON binds a request body into dst and converts any failure into a
// ready-to-Respond 400 invalid_request with per-field details.
//
// On success it returns nil and the caller continues; on failure it responds
// and the handler should return immediately.
func BindJSON(c *gin.Context, dst any) *Error {
	if err := c.ShouldBindJSON(dst); err != nil {
		apiErr := InvalidRequest(detailsFor(err, reflect.TypeOf(dst)))
		Respond(c, apiErr)
		return apiErr
	}
	return nil
}

// detailsFor maps a binding failure to contract §1 details: a map of
// JSON field name to human-readable message.
func detailsFor(err error, dstType reflect.Type) map[string]string {
	details := map[string]string{}

	var syntaxErr *json.SyntaxError
	if errors.As(err, &syntaxErr) {
		details["body"] = "request body is not valid JSON"
		return details
	}

	var typeErr *json.UnmarshalTypeError
	if errors.As(err, &typeErr) {
		details["body"] = "request body has a field of the wrong type"
		return details
	}

	var validationErrs validator.ValidationErrors
	if errors.As(err, &validationErrs) {
		for _, fieldErr := range validationErrs {
			details[jsonFieldName(dstType, fieldErr.StructField())] = messageFor(fieldErr)
		}
		return details
	}

	details["body"] = "request body could not be parsed"
	return details
}

// messageFor turns a validator.FieldError into a client-safe sentence.
//
// validator.FieldError exposes only the failing tag and its parameter (there
// is no Message method in validator v10), and FieldError.Error() embeds the Go
// struct name, which is not something to show a user. So the message is built
// from the tag and its parameter instead.
func messageFor(fieldErr validator.FieldError) string {
	param := fieldErr.Param()

	switch fieldErr.ActualTag() {
	case "required":
		return "is required"
	case "email":
		return "must be a valid email address"
	case "min":
		return "must be at least " + param + " characters"
	case "gte":
		return "must be greater than or equal to " + param
	case "lte":
		return "must be less than or equal to " + param
	case "gt":
		return "must be greater than " + param
	case "lt":
		return "must be less than " + param
	case "max":
		return "must be at most " + param + " characters"
	default:
		return "failed validation: " + fieldErr.ActualTag()
	}
}

// jsonFieldName maps a Go struct field name to its JSON name, preferring the
// json struct tag and falling back to the lowercased Go field name. Contract
// §1 requires JSON names, because those are what the client sent.
func jsonFieldName(dstType reflect.Type, structField string) string {
	for dstType != nil && dstType.Kind() == reflect.Ptr {
		dstType = dstType.Elem()
	}

	if dstType != nil && dstType.Kind() == reflect.Struct {
		if field, ok := dstType.FieldByName(structField); ok {
			if name := jsonTagName(field); name != "" {
				return name
			}
		}
	}

	return strings.ToLower(structField)
}

// jsonTagName reads the wire name out of a struct field's json tag.
func jsonTagName(field reflect.StructField) string {
	tag := field.Tag.Get("json")
	if tag == "" || tag == "-" {
		return ""
	}

	name, _, _ := strings.Cut(tag, ",")
	if name == "" {
		return ""
	}

	return name
}
