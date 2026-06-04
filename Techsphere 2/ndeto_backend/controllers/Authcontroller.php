<?php
require_once __DIR__ . '/../includes/Response.php';
require_once __DIR__ . '/../config/database.php';

function handleRegister($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $name = $data['name'] ?? '';
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    
    if (!$name || !$email || !$password) {
        sendJSON(['error' => 'Missing fields'], 400);
    }
    // check if email exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        sendJSON(['error' => 'Email already registered'], 400);
    }
    
    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $api_token = bin2hex(random_bytes(32));
    
    $stmt = $pdo->prepare("INSERT INTO users (name, email, password, api_token) VALUES (?, ?, ?, ?)");
    $stmt->execute([$name, $email, $hashed, $api_token]);
    
    $userId = $pdo->lastInsertId();
    sendJSON([
        'token' => $api_token,
        'user' => [
            'id' => $userId,
            'name' => $name,
            'email' => $email,
            'memberSince' => date('Y-m-d')
        ]
    ]);
}

function handleLogin($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || !password_verify($password, $user['password'])) {
        sendJSON(['error' => 'Invalid credentials'], 401);
    }
    // generate new token each login (optional)
    $newToken = bin2hex(random_bytes(32));
    $stmt = $pdo->prepare("UPDATE users SET api_token = ? WHERE id = ?");
    $stmt->execute([$newToken, $user['id']]);
    
    sendJSON([
        'token' => $newToken,
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'memberSince' => $user['created_at']
        ]
    ]);
}
?>