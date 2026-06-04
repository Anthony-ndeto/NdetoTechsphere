<?php
require_once 'config/database.php';
require_once 'includes/Response.php';
require_once 'controllers/AuthController.php';
require_once 'controllers/ProductController.php';
require_once 'controllers/CartController.php';
require_once 'controllers/OrderController.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = strtok($_SERVER['REQUEST_URI'], '?');
$path = str_replace('/ndeto-backend', '', $path); // adjust if your folder name differs

// handle preflight CORS
if ($method === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, x-auth-token');
    exit;
}

// routing
if ($path === '/api/auth/register' && $method === 'POST') {
    handleRegister($pdo);
} 
elseif ($path === '/api/auth/login' && $method === 'POST') {
    handleLogin($pdo);
}
elseif ($path === '/api/products' && $method === 'GET') {
    handleGetProducts($pdo);
}
elseif ($path === '/api/cart' && $method === 'GET') {
    $user = authenticate($pdo);
    handleGetCart($pdo, $user);
}
elseif ($path === '/api/cart' && $method === 'POST') {
    $user = authenticate($pdo);
    handleUpdateCart($pdo, $user);
}
elseif ($path === '/api/orders' && $method === 'POST') {
    $user = authenticate($pdo);
    handleCreateOrder($pdo, $user);
}
elseif ($path === '/api/orders' && $method === 'GET') {
    $user = authenticate($pdo);
    handleGetOrders($pdo, $user);
}
else {
    sendJSON(['error' => 'Endpoint not found'], 404);
}
?>