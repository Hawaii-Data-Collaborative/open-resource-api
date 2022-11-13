cd db
filename=db.sqlite3.`date "+%Y%m%d_%H%M"`
cp db.sqlite3 $filename
echo "[backup] copied db/db.sqlite3 to db/$filename"
