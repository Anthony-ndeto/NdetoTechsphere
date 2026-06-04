<?php
require_once __DIR__ . '/../includes/Response.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleGetCart($pdo, $user) {
    $stmt = $pdo->prepare("
        SELECT p.id, p.name, p.price, p.image, ci.quantity 
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = ?
    ");
    $stmt->execute([$user['id']]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    sendJSON($items);
}

function handleUpdateCart($pdo, $user) {
    $data = json_decode(file_get_contents('php://input'), true);
    $items = $data['items'] ?? [];  // array of {id, quantity}
    
    // delete old cart for this user
    $stmt = $pdo->prepare("DELETE FROM cart_items WHERE user_id = ?");
    $stmt->execute([$user['id']]);
    
    // insert new items
    $insert = $pdo->prepare("INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)");
    foreach ($items as $item) {
        if ($item['quantity'] > 0) {
            $insert->execute([$user['id'], $item['id'], $item['quantity']]);
        }
    }
    sendJSON(['message' => 'Cart updated']);
}
?>