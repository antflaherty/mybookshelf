-- +goose Up

CREATE TABLE book (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    page_count INTEGER NOT NULL,
    cover_uri TEXT
);

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
);

CREATE TABLE shelf (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL,

    CONSTRAINT fk_shelf_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);

CREATE TABLE bookmark (
    book_id TEXT NOT NULL,
    current_page INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    shelf_id TEXT NOT NULL,

    PRIMARY KEY (user_id, book_id),

    CONSTRAINT fk_bookmark_book
        FOREIGN KEY (book_id)
        REFERENCES book(id),

    CONSTRAINT fk_bookmark_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_bookmark_shelf
        FOREIGN KEY (shelf_id)
        REFERENCES shelf(id)
);

CREATE TABLE review (
    book_id TEXT NOT NULL,
    stars INTEGER NOT NULL CHECK (stars BETWEEN 0 AND 20),
    user_id TEXT NOT NULL,
    created_timestamp TEXT NOT NULL,
    last_edited_timestamp TEXT,
    comment TEXT,

    UNIQUE (user_id, book_id),

    CONSTRAINT fk_review_book
        FOREIGN KEY (book_id)
        REFERENCES book(id),

    CONSTRAINT fk_review_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);

-- +goose Down

DROP TABLE review;
DROP TABLE bookmark;
DROP TABLE shelf;
DROP TABLE book;
DROP TABLE users;