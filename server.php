<?php

require 'vendor/autoload.php';

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

class GameServer implements MessageComponentInterface
{
    private $clients;
    private $point;
    private $gameArea = 600;
    private $pixelLength = 30;
    private $playerVelocity = 10;
    private $playersScore = [];

    public function __construct()
    {
        $this->clients = new \SplObjectStorage();
        $this->generateNewPoint();
    }

    // Gera um novo ponto aleatória no jogo.
    private function generateNewPoint(): void
    {
        $this->point = [
            'x' => rand(0, $this->gameArea - $this->pixelLength),
            'y' => rand(0, $this->gameArea - $this->pixelLength)
        ];
    }

    // Ajusta a coordenada para criar o efeito "wrap-around" da tela.
    private function wrapCoordinate(int $coord): int
    {
        if ($coord + $this->pixelLength >= $this->gameArea) {
            return 0;
        } elseif ($coord < 0) {
            return $this->gameArea - $this->pixelLength;
        }
        return $coord;
    }

    // Verifica se há colisão entre o jogador e o ponto.
    private function checkCollision(int $x, int $y): bool
    {
        return (abs($x - $this->point['x']) <= $this->pixelLength) &&
            (abs($y - $this->point['y']) <= $this->pixelLength);
    }

    public function onOpen(ConnectionInterface $conn)
    {
        $this->clients->attach($conn);
        echo "Nova conexão: ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg)
    {
        echo "Dados recebidos: {$msg}\n";
        $data = json_decode($msg, true);

        // Se o ID do jogador não for enviado, ignora a mensagem.
        if (!isset($data['id'])) return;

        $playerId = $data['id'];
        if (!isset($this->playersScore[$playerId])) {
            $this->playersScore[$playerId] = 0;
        }

        // Aplica o wrap-around para os eixos X e Y
        $data['x'] = $this->wrapCoordinate((int)$data['x']);
        $data['y'] = $this->wrapCoordinate((int)$data['y']);

        // Gerar novo ponto de houve colisão
        if ($this->checkCollision($data['x'], $data['y'])) {
            $this->generateNewPoint();
            $this->playersScore[$playerId]++;
            echo "Score do jogador {$playerId}: " . $this->playersScore[$playerId] . "\n";
        }

        $response = json_encode([
            'player' => [
                'id' => $playerId,
                'from' => $from->resourceId,
                'velocity' => $this->playerVelocity,
                'x' => $data['x'],
                'y' => $data['y'],
                'type' => $data['type'] ?? null,
                'direction' => $data['direction'] ?? null,
            ],
            'point' => $this->point,
            'players_score' => $this->playersScore
        ]);

        // Envia a resposta para todos os clientes conectados
        foreach ($this->clients as $client) {
            $client->send($response);
        }
    }

    public function onClose(ConnectionInterface $conn)
    {
        $this->clients->detach($conn);
        echo "Conexão encerrada: ({$conn->resourceId})\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e)
    {
        echo "Erro: {$e->getMessage()}\n";
        $conn->close();
    }
}

// Inicializa o servidor WebSocket na porta 8080
$server = IoServer::factory(
    new HttpServer(new WsServer(new GameServer())),
    8080
);

echo "Servidor WebSocket rodando na porta 8080...\n";
$server->run();
