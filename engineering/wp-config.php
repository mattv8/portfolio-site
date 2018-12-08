<?php
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the
 * installation. You don't have to use the web site, you can
 * copy this file to "wp-config.php" and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * MySQL settings
 * * Secret keys
 * * Database table prefix
 * * ABSPATH
 *
 * @link https://codex.wordpress.org/Editing_wp-config.php
 *
 * @package WordPress
 */

// ** MySQL settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define('DB_NAME', 'admin_wp-sites');

/** MySQL database username */
define('DB_USER', 'admin_wp-sites');

/** MySQL database password */
define('DB_PASSWORD', 'J35jWJ8e');

/** MySQL hostname */
define('DB_HOST', 'localhost');

/** Database Charset to use in creating database tables. */
define('DB_CHARSET', 'utf8mb4');

/** The Database Collate type. Don't change this if in doubt. */
define('DB_COLLATE', '');

/**#@+
 * Authentication Unique Keys and Salts.
 *
 * Change these to different unique phrases!
 * You can generate these using the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}
 * You can change these at any point in time to invalidate all existing cookies. This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define('AUTH_KEY',         '(T!N4EU=^,9f)cwY4SCD2j|r+4@u!SG0M@xd{gQ~_|~cC}f)S}ZE@^PO-<L_qA-p');
define('SECURE_AUTH_KEY',  '4e=;%{|9B@hL+QN==Bf5jk@Gmy#Z=/JS5s0>5gJi1smP,NVw4JY-fjt~Ux5R[8A#');
define('LOGGED_IN_KEY',    'J]<!Se_U.kWXZ-{A5xe[v`mP6m4g)yW3u]^p.}@83F^|{%%A3g=-vE-8-Hw0WeUz');
define('NONCE_KEY',        'd Xs:j-:t=M*1&CcF(27>imfeR{ 3]7o?[L3^`:2gV[;i~81sN#B?Hg|_s}h[ypb');
define('AUTH_SALT',        '4!6-Lfd?`<bpj=4xIq9W[0M~P8q#3pwY*G3*r,$u^EQ;I^@e`jJizH_v~{ +W<pZ');
define('SECURE_AUTH_SALT', 'g4Y}+xQFa>q0ymUb-RGfoOx(d 6r:[ny0*dqhZ(Ybee,rn]h[A+<ie]t^]c0HV>v');
define('LOGGED_IN_SALT',   '07PCl@3;7/> Ku.T=Tf2`e 9BQQY6Fn*=]tDA#(>LEI#V8:e4dO_=cB/D75cQ4&7');
define('NONCE_SALT',       'XWVXW%fhY.DV5n#4o_!v:7{)XwKzo/99/JLe-:_zIyjT<U9gf ]& em}:PF[;8FC');

/**#@-*/

/**
 * WordPress Database Table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix  = 'engineering_';

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the Codex.
 *
 * @link https://codex.wordpress.org/Debugging_in_WordPress
 */
define('WP_DEBUG', false);

/* That's all, stop editing! Happy blogging. */

/** Absolute path to the WordPress directory. */
if ( !defined('ABSPATH') )
	define('ABSPATH', dirname(__FILE__) . '/');

/** Sets up WordPress vars and included files. */
require_once(ABSPATH . 'wp-settings.php');
