from sqlmodel import SQLModel, create_engine, Session
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "workspace.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

# check_same_thread=False is needed because SQLite + FastAPI's default
# threadpool for sync endpoints don't share the same thread.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def init_db():
    SQLModel.metadata.create_all(engine)
    _migrate_sqlite_columns()


def _migrate_sqlite_columns():
    migrations = {
        "todo": {
            "description": "VARCHAR NOT NULL DEFAULT ''",
            "priority": "INTEGER NOT NULL DEFAULT 3",
            "completed_at": "DATETIME",
        },
        "note": {
            "pinned": "BOOLEAN NOT NULL DEFAULT 0",
        },
    }
    with engine.connect() as conn:
        for table, columns in migrations.items():
            existing = {row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table})")}
            for column, ddl in columns.items():
                if column not in existing:
                    conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")
        conn.commit()


def get_session():
    with Session(engine) as session:
        yield session
