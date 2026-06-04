<?php
require_once __DIR__ . '/../includes/Response.php';
require_once __DIR__ . '/../config/database.php';

function handleGetProducts($pdo) {
    $stmt = $pdo->query("SELECT id, name, price, image, category, rating FROM products");
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    sendJSON($products);
}
?>