package books

import "github.com/antflaherty/mybookshelf/backend/domain"

type BookDetails struct {
	ID     string      `json:"id"`
	Blurb  string      `json:"blurb"`
	Genres []string    `json:"genres"`
	Book   domain.Book `json:"book"`
}
