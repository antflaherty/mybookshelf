package main

import "database/sql"

func queryAllShelves(db *sql.DB, userID string) (*[]shelf, error) {
	sqlString := "SELECT id, sort_order, name FROM shelf WHERE user_id = ?"

	rows, err := db.Query(sqlString, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var allShelves []shelf
	for rows.Next() {
		shelf := &shelf{}
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
