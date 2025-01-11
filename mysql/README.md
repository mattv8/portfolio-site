# Restoring a database

### Step 1: Import Database

1. **Export the Database** from WordPress using  WP-CLI (or mysqldump, phpMyAdmin, but ensure it is mariadb compatible):

    ```bash
    mysqldump -u hammertonmultisite -p hammertonmultisite > hmbackup.sql
    ```
2. Place the SQL File in the `mysql/` directory. This setup will automatically import any .sql files in `mysql/` when the MySQL Docker container is built.
3. If you've made changes to your `.env` database variables (`DB_NAME`, `DB_USER` or `DB_PASSWORD`) you must run the following command to recreate the `_grants.sql` script:
    ```bash
    bash .vscode\install.sh
    ```

### Step 2: Recreate MariaDB Docker Container
    ```bash
    sudo docker compose stop mariadb
    sudo docker volume rm $(basename "$PWD")_db_data
    ```
The next time you run `docker compose up`, the MariaDB container will initialize with a clean database, and your SQL dump will be restored.

### Step 3: Multi-site installs you may need to insert these rows after DB initialization
```sql
INSERT INTO `ft_site` (domain, path) VALUES ('http://www.localhost:81', '/');
INSERT INTO `ft_blogs` (site_id, domain, path, registered, last_updated, public, archived, mature, spam, deleted, lang_id)
VALUES (1, 'www.localhost:81', '/', NOW(), NOW(), 1, 0, 0, 0, 0, 0);
```