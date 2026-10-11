-- +goose Up

ALTER TABLE bookmark
    ADD COLUMN book_type TEXT NOT NULL DEFAULT 'physical'
    CONSTRAINT chk_bookmark_book_type CHECK (book_type IN ('physical', 'ebook', 'audiobook'));

-- +goose Down

ALTER TABLE bookmark DROP COLUMN book_type;