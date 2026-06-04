<?php
require_once __DIR__ . '/../includes/Response.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleCreateOrder($pdo, $user) {
    $data = json_decode(file_get_contents('php://input'), true);
    $items = $data['items'] ?? [];
    $customerName = $data['customerName'] ?? '';
    $customerPhone = $data['customerPhone'] ?? '';
    $deliveryLocation = $data['deliveryLocation'] ?? '';
    $total = $data['total'] ?? 0;
    
    if (empty($items) || !$customerName || !$customerPhone || !$deliveryLocation) {
        sendJSON(['error' => 'Missing order details'], 400);
    }
    
    $orderId = 'NDT-' . strtoupper(bin2hex(random_bytes(4)));
    
    $pdo->beginTransaction();
    try {
        // insert order
        $stmt = $pdo->prepare("
            INSERT INTO orders (order_id, user_id, customer_name, customer_phone, delivery_location, total)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$orderId, $user['id'], $customerName, $customerPhone, $deliveryLocation, $total]);
        
        // insert order items
        $itemStmt = $pdo->prepare("
            INSERT INTO order_items (order_id, product_id, name, price, quantity)
            VALUES (?, ?, ?, ?, ?)
        ");
        foreach ($items as $item) {
            $itemStmt->execute([$orderId, $item['id'], $item['name'], $item['price'], $item['quantity']]);
        }
        // clear user's cart
        $delCart = $pdo->prepare("DELETE FROM cart_items WHERE user_id = ?");
        $delCart->execute([$user['id']]);
        
        $pdo->commit();
        sendJSON(['orderId' => $orderId]);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJSON(['error' => 'Order failed'], 500);
    }
}

function handleGetOrders($pdo, $user) {
    $stmt = $pdo->prepare("
        SELECT order_id, total, date, status, customer_name, customer_phone, delivery_location
        FROM orders
        WHERE user_id = ?
        ORDER BY date DESC
    ");
    $stmt->execute([$user['id']]);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // enrich each order with its items
    foreach ($orders as &$order) {
        $stmtItems = $pdo->prepare("
            SELECT product_id, name, price, quantity
            FROM order_items
            WHERE order_id = ?
        ");
        $stmtItems->execute([$order['order_id']]);
        $order['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);
        $order['orderId'] = $order['order_id'];
        unset($order['order_id']);
    }
    sendJSON($orders);
}
?>