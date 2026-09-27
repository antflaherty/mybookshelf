package books

type BookDetails struct {
	ID     string   `json:"id"`
	Blurb  string   `json:"blurb"`
	Genres []string `json:"genres"`
}
