package books

type BookDetailsProvider interface {
	GetBookDetails(bookId string) (*BookDetails, error)
}
