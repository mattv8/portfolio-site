# Portfolio Site Development Guide

This is a containerized PHP portfolio website using Docker, Nginx, PHP-FPM, MariaDB, and Smarty templating.

## Architecture Overview

- **Multi-container setup**: Nginx proxy → PHP-FPM → MariaDB with PHPMyAdmin
- **Page-based routing**: URL `?page=landing` loads `src/landing.php` + `src/tpl/landing.tpl`
- **Smarty templating**: All templates in `src/tpl/` with shared `header.tpl`/`footer.tpl`
- **Configuration hierarchy**: `src/conf/config.php` + optional `config.local.php` override
- **Encrypted caching system**: Smarty compilation cache + FileEncryption class for sensitive API data

## Development Workflows

### Environment Setup
1. Use VS Code task **"Install Environment"** (Ctrl+Shift+P → Tasks: Run Task)
   - Creates `.env` from `.env.example` if missing
   - Exports environment variables for Docker
2. Use VS Code task **"Start Server"** to build and run containers
   - Equivalent to `docker compose up --build`

### Development Process
- **Main entry**: `src/index.php` handles routing and Smarty initialization
- **Page creation**: Add `{pagename}.php` + `tpl/{pagename}.tpl` for new pages
- **Debugging**: Toggle `$debug = true` in `config.php` or `config.local.php`

## Project-Specific Patterns

### File Organization
```
src/
├── conf/config.php          # Main config (override with config.local.php)
├── lib/functions.php        # Utility functions (PVE API, Git APIs)
├── lib/encryption.php       # FileEncryption class for sensitive data
├── {page}.php              # Page controllers (landing.php, server.php, etc.)
├── tpl/{page}.tpl          # Smarty templates
└── cache/                  # Smarty compilation + custom caching
```

### Configuration Conventions
- **Environment variables**: Docker services use `.env` file variables
- **Config structure**: Main config assigns to `$smarty` globals, local overrides in `config.local.php`
- **Sensitive credentials**: API keys, tokens, and credentials stored in `config.local.php` arrays (PVE, InfluxDB, GitLab, GitHub, Fitbit)
- **Debug flags**: `$debug` and `$smarty_debug` control error reporting and template debugging

### Smarty Template Patterns
- **Template inclusion**: `{include file="tpl/header.tpl"}` for shared components
- **Dynamic includes**: `{if file_exists("tpl/$page.tpl")}{include file="tpl/$page.tpl"}{/if}`
- **Error handling**: Check `{if isset($error)}` for error display
- **JS config injection**: PHP `$js_config` array becomes JS object in templates
- **Asset fallbacks**: `{if file_exists('js/script.min.js')}...{else}...{/if}` pattern for minified/dev assets
- **Debug styling**: Conditional CSS using `{if $debug}` blocks for visual debugging

### JavaScript & CSS Conventions
- **Minification pattern**: Always reference minified versions with fallback - `script.min.js` → `script.js`
- **Hexagon system**: Core UI component using CSS clip-path polygons with flip animations
- **Lazy loading**: Hexagon backgrounds support `data-lazy-load` with loading states
- **Custom cursors**: Hexagons use SVG cursor assets for different interaction types

### API Integration Patterns
- **Custom functions**: `lib/functions.php` contains PVE API, GitLab/GitHub API helpers
- **Encrypted caching**: `lib/encryption.php` FileEncryption class secures API responses and sensitive cache data
- **Session-based state**: UI preferences and temporary data in `$_SESSION`
- **Image randomization**: Smart algorithm in `landing.php` prevents consecutive duplicates

### Docker Integration
- **Volume mapping**: `./src` maps to container `/var/www/html`
- **Log centralization**: All logs in `./logs` directory
- **Database init**: SQL files in `./mysql/` run on container build
- **Environment inheritance**: Host UID/GID passed to containers for permissions

## Critical Files to Understand

- `src/index.php`: Main router and Smarty setup
- `src/conf/config.php` + `config.local.php`: Core configuration patterns and sensitive credentials
- `src/css/hexagons.css`: Core UI hexagon system with clip-path polygons and animations
- `src/tpl/landing.tpl`: Primary template showcasing hexagon layout and Smarty patterns
- `docker-compose.yml`: Service dependencies and networking
- `.vscode/install.sh`: Environment setup and .env validation
- `src/lib/functions.php`: Custom API integration patterns
- `src/lib/encryption.php`: FileEncryption class for secure caching

## Testing & Quality

- **Error logging**: PHP errors to `logs/php_errors.log`, Nginx to `logs/nginx_*.log`
- **Development debugging**: Use `$smarty_debug = true` for template inspection