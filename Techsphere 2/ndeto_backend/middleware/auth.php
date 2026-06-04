<?php
require_once __DIR__ . '/../config/database.php';
function authenticate($pdo) {
    $headers = getallheaders();
    $token = $headers['x-auth-token'] ?? '';
    if (!$token) {
        sendJSON(['error' => 'Authentication token required'], 401);
    }
    $stmt = $pdo->prepare("SELECT * FROM users WHERE api_token = ?");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        sendJSON(['error' => 'Invalid or expired token'], 401);
    }
    return $user;
}
?>