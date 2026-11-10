<?php
/**
 * DAINTY STUDS & CHAINS - Hostinger Online Persistence & Database API
 * Handles live cross-device synchronization on Hostinger hosting.
 * Supports Hostinger MySQL Database (PDO) or Hostinger Server File Database.
 */

// Enable error logging while returning clean JSON
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
ini_set('display_errors', '0');

// CORS Headers
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS, PUT');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dbConfigFile = __DIR__ . '/db_config.json';
$productsDbFile = __DIR__ . '/products_db.json';
$deletedIdsFile = __DIR__ . '/deleted_ids.json';

// Helper to get MySQL PDO connection if configured
function getPdoConnection($configFile) {
    if (!file_exists($configFile)) {
        return null;
    }
    $cfg = json_decode(file_get_contents($configFile), true);
    if (!$cfg || empty($cfg['db_host']) || empty($cfg['db_name']) || empty($cfg['db_user'])) {
        return null;
    }

    try {
        $dsn = "mysql:host={$cfg['db_host']};dbname={$cfg['db_name']};charset=utf8mb4";
        $pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'] ?? '', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 5
        ]);

        // Auto-initialize tables
        $pdo->exec("CREATE TABLE IF NOT EXISTS dainty_products (
            id VARCHAR(128) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            price INT NOT NULL DEFAULT 0,
            sale_price INT NULL,
            data LONGTEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $pdo->exec("CREATE TABLE IF NOT EXISTS dainty_deleted_ids (
            id VARCHAR(128) PRIMARY KEY,
            deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        return $pdo;
    } catch (Exception $e) {
        error_log("Hostinger MySQL connection error: " . $e->getMessage());
        return null;
    }
}

// File storage helpers
function getFileDeletedIds($file) {
    if (file_exists($file)) {
        $data = json_decode(file_get_contents($file), true);
        if (is_array($data)) return $data;
    }
    return [];
}

function saveFileDeletedIds($file, $ids) {
    file_put_contents($file, json_encode(array_values(array_unique($ids)), JSON_PRETTY_PRINT), LOCK_EX);
}

function getFileProducts($productsFile, $deletedFile) {
    $deleted = array_flip(getFileDeletedIds($deletedFile));
    if (file_exists($productsFile)) {
        $content = file_get_contents($productsFile);
        $products = json_decode($content, true);
        if (is_array($products)) {
            $filtered = [];
            foreach ($products as $p) {
                if (isset($p['id']) && !isset($deleted[$p['id']])) {
                    $filtered[] = $p;
                }
            }
            return $filtered;
        }
    }
    return [];
}

function saveFileProducts($file, $products) {
    file_put_contents($file, json_encode($products, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

// Parse request
$method = $_SERVER['REQUEST_METHOD'];
$endpoint = $_GET['endpoint'] ?? '';
$id = $_GET['id'] ?? '';

// Fallback path parsing
if (empty($endpoint)) {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (preg_match('#/api/products/([^/]+)#', $uri, $matches)) {
        $endpoint = 'products';
        $id = $matches[1];
    } elseif (strpos($uri, '/api/products/reset') !== false) {
        $endpoint = 'reset';
    } elseif (strpos($uri, '/api/products') !== false) {
        $endpoint = 'products';
    } elseif (strpos($uri, '/api/database/config') !== false) {
        $endpoint = 'db_config';
    } elseif (strpos($uri, '/api/database/status') !== false) {
        $endpoint = 'db_status';
    }
}

$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true);

$pdo = getPdoConnection($dbConfigFile);

// -----------------------------------------------------------------------------
// ROUTE: Database Status / Connection Test
// -----------------------------------------------------------------------------
if ($endpoint === 'db_status' || $endpoint === 'database/status') {
    if ($pdo) {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM dainty_products");
        $count = $stmt->fetch()['count'] ?? 0;
        echo json_encode([
            'status' => 'connected',
            'driver' => 'Hostinger MySQL Database',
            'products_count' => (int)$count,
            'persistent' => true
        ]);
    } else {
        $prods = getFileProducts($productsDbFile, $deletedIdsFile);
        echo json_encode([
            'status' => 'connected',
            'driver' => 'Hostinger Server File Database',
            'products_count' => count($prods),
            'persistent' => true,
            'note' => 'To use Hostinger MySQL, enter credentials in Admin Settings.'
        ]);
    }
    exit;
}

// -----------------------------------------------------------------------------
// ROUTE: Save Database Configuration
// -----------------------------------------------------------------------------
if (($endpoint === 'db_config' || $endpoint === 'database/config') && $method === 'POST') {
    $cfg = [
        'db_host' => trim($body['db_host'] ?? 'localhost'),
        'db_name' => trim($body['db_name'] ?? ''),
        'db_user' => trim($body['db_user'] ?? ''),
        'db_pass' => (string)($body['db_pass'] ?? '')
    ];

    if (empty($cfg['db_name']) || empty($cfg['db_user'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Database name and username are required.']);
        exit;
    }

    try {
        $dsn = "mysql:host={$cfg['db_host']};dbname={$cfg['db_name']};charset=utf8mb4";
        $testPdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 4
        ]);
        
        file_put_contents($dbConfigFile, json_encode($cfg, JSON_PRETTY_PRINT), LOCK_EX);

        // Migrate existing products if any
        $existing = getFileProducts($productsDbFile, $deletedIdsFile);
        $testPdo->exec("CREATE TABLE IF NOT EXISTS dainty_products (
            id VARCHAR(128) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            price INT NOT NULL DEFAULT 0,
            sale_price INT NULL,
            data LONGTEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $testPdo->exec("CREATE TABLE IF NOT EXISTS dainty_deleted_ids (
            id VARCHAR(128) PRIMARY KEY,
            deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        if (!empty($existing)) {
            $insert = $testPdo->prepare("INSERT INTO dainty_products (id, name, price, sale_price, data) VALUES (:id, :name, :price, :sale_price, :data) ON DUPLICATE KEY UPDATE name = :name, price = :price, sale_price = :sale_price, data = :data");
            foreach ($existing as $p) {
                $insert->execute([
                    ':id' => $p['id'],
                    ':name' => $p['name'] ?? 'Jewelry Piece',
                    ':price' => (int)($p['price'] ?? 0),
                    ':sale_price' => isset($p['sale_price']) ? (int)$p['sale_price'] : null,
                    ':data' => json_encode($p, JSON_UNESCAPED_UNICODE)
                ]);
            }
        }

        echo json_encode([
            'success' => true,
            'message' => 'Successfully connected to Hostinger MySQL Database and synced existing products!'
        ]);
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Connection failed: ' . $e->getMessage()
        ]);
    }
    exit;
}

// -----------------------------------------------------------------------------
// ROUTE: GET Products
// -----------------------------------------------------------------------------
if ($endpoint === 'products' && $method === 'GET') {
    if ($pdo) {
        $stmt = $pdo->query("SELECT p.data FROM dainty_products p LEFT JOIN dainty_deleted_ids d ON p.id = d.id WHERE d.id IS NULL ORDER BY p.updated_at DESC");
        $results = [];
        while ($row = $stmt->fetch()) {
            $decoded = json_decode($row['data'], true);
            if ($decoded) $results[] = $decoded;
        }
        echo json_encode($results);
    } else {
        $products = getFileProducts($productsDbFile, $deletedIdsFile);
        echo json_encode($products);
    }
    exit;
}

// -----------------------------------------------------------------------------
// ROUTE: POST (Create / Update Product)
// -----------------------------------------------------------------------------
if ($endpoint === 'products' && $method === 'POST') {
    if (!is_array($body) || empty($body['name'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Product name is required.']);
        exit;
    }

    $product = $body;
    if (empty($product['id'])) {
        $product['id'] = 'prod_' . substr(md5(uniqid(mt_rand(), true)), 0, 9);
        $product['created_at'] = gmdate('Y-m-d\TH:i:s\Z');
    }

    $productId = $product['id'];

    if ($pdo) {
        // Remove from deleted blacklist if re-added
        $delStmt = $pdo->prepare("DELETE FROM dainty_deleted_ids WHERE id = :id");
        $delStmt->execute([':id' => $productId]);

        $stmt = $pdo->prepare("INSERT INTO dainty_products (id, name, price, sale_price, data) 
            VALUES (:id, :name, :price, :sale_price, :data) 
            ON DUPLICATE KEY UPDATE name = :name, price = :price, sale_price = :sale_price, data = :data");
        $stmt->execute([
            ':id' => $productId,
            ':name' => $product['name'],
            ':price' => (int)($product['price'] ?? 0),
            ':sale_price' => isset($product['sale_price']) ? (int)$product['sale_price'] : null,
            ':data' => json_encode($product, JSON_UNESCAPED_UNICODE)
        ]);
    } else {
        // Remove from deleted list
        $deleted = getFileDeletedIds($deletedIdsFile);
        if (in_array($productId, $deleted)) {
            $deleted = array_diff($deleted, [$productId]);
            saveFileDeletedIds($deletedIdsFile, $deleted);
        }

        $all = getFileProducts($productsDbFile, $deletedIdsFile);
        $found = false;
        foreach ($all as $idx => $p) {
            if ($p['id'] === $productId) {
                $all[$idx] = array_merge($p, $product);
                $found = true;
                break;
            }
        }
        if (!$found) {
            array_unshift($all, $product);
        }
        saveFileProducts($productsDbFile, $all);
    }

    echo json_encode($product);
    exit;
}

// -----------------------------------------------------------------------------
// ROUTE: DELETE Product
// -----------------------------------------------------------------------------
if (($endpoint === 'products' || strpos($endpoint, 'products/') === 0) && $method === 'DELETE') {
    if (empty($id)) {
        $id = str_replace('products/', '', $endpoint);
    }

    if (empty($id)) {
        http_response_code(400);
        echo json_encode(['error' => 'Product ID is required for deletion.']);
        exit;
    }

    if ($pdo) {
        // Insert into deleted blacklist
        $insDel = $pdo->prepare("INSERT IGNORE INTO dainty_deleted_ids (id) VALUES (:id)");
        $insDel->execute([':id' => $id]);

        // Remove from active products
        $delStmt = $pdo->prepare("DELETE FROM dainty_products WHERE id = :id");
        $delStmt->execute([':id' => $id]);
    } else {
        // Add to permanent blacklist
        $deleted = getFileDeletedIds($deletedIdsFile);
        if (!in_array($id, $deleted)) {
            $deleted[] = $id;
            saveFileDeletedIds($deletedIdsFile, $deleted);
        }

        $all = getFileProducts($productsDbFile, $deletedIdsFile);
        $filtered = array_values(array_filter($all, function($p) use ($id) {
            return ($p['id'] ?? '') !== $id;
        }));
        saveFileProducts($productsDbFile, $filtered);
    }

    echo json_encode([
        'success' => true,
        'deletedId' => $id,
        'message' => "Product {$id} permanently deleted."
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// ROUTE: Reset Database to Seed Catalog
// -----------------------------------------------------------------------------
if ($endpoint === 'reset' && $method === 'POST') {
    $seed = is_array($body) ? $body : [];
    if ($pdo) {
        $pdo->exec("TRUNCATE TABLE dainty_deleted_ids");
        $pdo->exec("TRUNCATE TABLE dainty_products");
        if (!empty($seed)) {
            $insert = $pdo->prepare("INSERT INTO dainty_products (id, name, price, sale_price, data) VALUES (:id, :name, :price, :sale_price, :data)");
            foreach ($seed as $p) {
                $insert->execute([
                    ':id' => $p['id'],
                    ':name' => $p['name'] ?? 'Jewelry Piece',
                    ':price' => (int)($p['price'] ?? 0),
                    ':sale_price' => isset($p['sale_price']) ? (int)$p['sale_price'] : null,
                    ':data' => json_encode($p, JSON_UNESCAPED_UNICODE)
                ]);
            }
        }
    } else {
        saveFileDeletedIds($deletedIdsFile, []);
        if (!empty($seed)) {
            saveFileProducts($productsDbFile, $seed);
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Database restored to initial catalog.'
    ]);
    exit;
}

// 404 Fallback
http_response_code(404);
echo json_encode(['error' => 'API route not found.']);
