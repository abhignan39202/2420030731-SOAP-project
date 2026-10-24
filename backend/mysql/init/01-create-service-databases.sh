#!/bin/sh
set -e

: "${MYSQL_APP_PASSWORD:?MYSQL_APP_PASSWORD must be configured}"
: "${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD must be configured}"

# Keep this value safe for direct interpolation into this initialization SQL.
case "$MYSQL_APP_PASSWORD" in
  ''|*[!A-Za-z0-9_-]*)
    echo "MYSQL_APP_PASSWORD may contain only letters, digits, underscore, and hyphen." >&2
    exit 1
    ;;
esac

umask 077
MYSQL_CLIENT_CNF="$(mktemp)"
trap 'rm -f "$MYSQL_CLIENT_CNF"' EXIT HUP INT TERM
cat > "$MYSQL_CLIENT_CNF" <<EOF
[client]
user=root
password=$MYSQL_ROOT_PASSWORD
host=${MYSQL_HOST:-localhost}
port=${MYSQL_PORT:-3306}
protocol=${MYSQL_PROTOCOL:-socket}
EOF

mysql --defaults-extra-file="$MYSQL_CLIENT_CNF" <<SQL
CREATE DATABASE IF NOT EXISTS rhc_auth;
CREATE DATABASE IF NOT EXISTS rhc_users;
CREATE DATABASE IF NOT EXISTS rhc_doctors;
CREATE DATABASE IF NOT EXISTS rhc_appointments;
CREATE DATABASE IF NOT EXISTS rhc_consultations;
CREATE DATABASE IF NOT EXISTS rhc_prescriptions;
CREATE DATABASE IF NOT EXISTS rhc_medicines;
CREATE DATABASE IF NOT EXISTS rhc_pharmacy;
CREATE DATABASE IF NOT EXISTS rhc_ambulance;
CREATE DATABASE IF NOT EXISTS rhc_notifications;

CREATE USER IF NOT EXISTS 'rhc_app'@'%' IDENTIFIED BY '$MYSQL_APP_PASSWORD';
ALTER USER 'rhc_app'@'%' IDENTIFIED BY '$MYSQL_APP_PASSWORD';
GRANT ALL PRIVILEGES ON rhc_auth.* TO 'rhc_app'@'%';
GRANT ALL PRIVILEGES ON rhc_users.* TO 'rhc_app'@'%';
GRANT ALL PRIVILEGES ON rhc_doctors.* TO 'rhc_app'@'%';
GRANT ALL PRIVILEGES ON rhc_appointments.* TO 'rhc_app'@'%';
GRANT ALL PRIVILEGES ON rhc_consultations.* TO 'rhc_app'@'%';
GRANT ALL PRIVILEGES ON rhc_prescriptions.* TO 'rhc_app'@'%';
GRANT ALL PRIVILEGES ON rhc_medicines.* TO 'rhc_app'@'%';
GRANT ALL PRIVILEGES ON rhc_pharmacy.* TO 'rhc_app'@'%';
GRANT ALL PRIVILEGES ON rhc_ambulance.* TO 'rhc_app'@'%';
GRANT ALL PRIVILEGES ON rhc_notifications.* TO 'rhc_app'@'%';
FLUSH PRIVILEGES;
SQL
