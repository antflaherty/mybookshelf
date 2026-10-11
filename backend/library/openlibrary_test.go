package library

import (
	"encoding/json"
	"testing"
)

func TestDescriptionUnmarshal_StringForm(t *testing.T) {
	var d openLibraryDescription
	err := json.Unmarshal([]byte(`"A classic novel about whales"`), &d)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if string(d) != "A classic novel about whales" {
		t.Errorf("unexpected value %q", d)
	}
}

func TestDescriptionUnmarshal_ObjectForm(t *testing.T) {
	var d openLibraryDescription
	err := json.Unmarshal([]byte(`{"value": "An epic adventure", "type": "/type/text"}`), &d)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if string(d) != "An epic adventure" {
		t.Errorf("unexpected value %q", d)
	}
}

func TestDescriptionUnmarshal_ObjectWithoutValue(t *testing.T) {
	var d openLibraryDescription
	err := json.Unmarshal([]byte(`{"unexpected": 123}`), &d)
	// Current behavior: an object missing "value" silently unmarshals to "".
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if string(d) != "" {
		t.Errorf("expected empty description, got %q", d)
	}
}
