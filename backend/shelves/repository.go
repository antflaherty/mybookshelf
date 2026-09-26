package shelves

import (
	"database/sql"

	"github.com/antflaherty/mybookshelf/backend/domain"
)

func queryAllShelves(db *sql.DB, userID string) (*[]domain.Shelf, error) {
	sqlString := "SELECT id, sort_order, name FROM shelf WHERE user_id = ?"

	rows, err := db.Query(sqlString, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var allShelves []domain.Shelf
	for rows.Next() {
		shelf := &domain.Shelf{}
		err := rows.Scan(&shelf.ID, &shelf.SortOrder, &shelf.Name)
		if err != nil {
			return nil, err
		}

		allShelves = append(allShelves, *shelf)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return &allShelves, nil
}
