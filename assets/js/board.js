// TODO gray out the forward button until this move is completed
// TODO play should wait for one move to finish before sending the next move.

var socket = new WebSocket("ws://localhost:3000/");
var socket_connected = false;
socket.onopen = function(){  
    socket_connected = true;
    console.log("Socket to game server successfully opened.");  
};

socket.onmessage = function(msg){  
    var move = JSON.parse(msg.data);
    if (move.error) {
        console.log(move.error);
        // TODO what move signals "bad move, player lost"?
        Board.callback(0);
    } else {
        playerState = move.state;
        Board.callback(move.move);
    }
};


function render_items(func) {
    items = "[(0,0),";
    var n = Board.numberOfItemTypes;
    for(var i=1; i <= n; i++) {
        items += "(" + i + "," + func(i) + ")";
        if (i != n) {
            items += ",";
        }
    }
    items += "]";
    return items;
}

var playerState = "empty";

var playerData = function() {
    return {
        WIDTH : WIDTH,
        HEIGHT : HEIGHT,
        get_my_x : get_my_x(),
        get_my_y : get_my_y(),
        get_opponent_x : get_opponent_x(),
        get_opponent_y : get_opponent_y(),
        get_board : get_board(),
        get_my_item_count : render_items(get_my_item_count),
        get_opponent_item_count : render_items(get_opponent_item_count),
        get_total_item_count : render_items(get_total_item_count),
        state : playerState
    };
};

var Board = {
    init: function() {
        var fullBoard;

        // initialize board
        HEIGHT = Math.min(Math.floor(Math.random() * 11) + 5, 15);
        WIDTH = Math.min(Math.floor(Math.random() * 11) + 5, 15);
        Board.board = new Array(WIDTH);

        for (var i=0; i<WIDTH; i++) {
            Board.board[i] = new Array(HEIGHT);
            for (var j=0; j<HEIGHT; j++) {
                Board.board[i][j] = 0;
            }
        }

        Board.history = new Array(WIDTH);

        for (var i=0; i<WIDTH; i++) {
            Board.history[i] = new Array(HEIGHT);
            for (var j=0; j<HEIGHT; j++) {
                Board.history[i][j] = 0;
            }
        }

        // initialize items on board
        do {
            Board.numberOfItemTypes = Math.floor(Math.random() * 3 + 3);
        } while(Board.numberOfItemTypes * Board.numberOfItemTypes >= HEIGHT * WIDTH)
        Board.totalItems = new Array();
        Board.simpleBotCollected = new Array(Board.numberOfItemTypes);
        Board.myBotCollected = new Array(Board.numberOfItemTypes);
        var x;
        var y;
        for (var i=0; i<Board.numberOfItemTypes; i++) {
            Board.myBotCollected[i] = 0;
            Board.simpleBotCollected[i] = 0;
            Board.totalItems[i] = i * 2 + 1;
            for (var j=0; j<Board.totalItems[i]; j++) {
                do {
                    x = Math.min(Math.floor(Math.random() * WIDTH), WIDTH);
                    y = Math.min(Math.floor(Math.random() * HEIGHT), HEIGHT);
                } while (Board.board[x][y] != 0);
                Board.board[x][y] = i + 1;
            }
        }

        // get them the same starting position
        do {
            x = Math.min(Math.floor(Math.random() * WIDTH), WIDTH);
            y = Math.min(Math.floor(Math.random() * HEIGHT), HEIGHT);
        } while (Board.board[x][y] != 0);
        Board.myX = x;
        Board.myY = y;
        Board.oppX = x;
        Board.oppY = y;
        Board.initial_state = {};
        jQuery.extend(true, Board.initial_state, Board);
    },
    reset: function() {
        Board = Board.initial_state;
        Board.initial_state = {};
        jQuery.extend(true, Board.initial_state, Board);
        Board.newGame();
        GamePlay.start();
    },
    newGame: function() {
        var new_game_exists = undefined;
        try {
            new_game_exists = new_game;
        } catch(e) {
        }
        if(new_game_exists !== undefined) {
            new_game();
        }
        // SimpleBot currently doesn't need any sort of init, but if it did, it'd be called here too
    },
    processMove: function() {
        // TODO do this thru an ajax call to a server instead.
        // or websockets!
        if (!socket_connected) {
            alert("I am not connected to the server. Please start the server with `ruby eventloop.rb` if you haven't already (and then refresh this page).\nIf you already started the server, your browser may not support websockets.");
        }
        socket.send(JSON.stringify(playerData()));
    },
    callback: function(move) {
        console.log("player is moving.");
        var myMove = move;
        var simpleBotMove = SimpleBot.makeMove();
        if ((Board.myX == Board.oppX) && (Board.myY == Board.oppY) && (myMove == TAKE) && (simpleBotMove == TAKE) && Board.board[Board.myX][Board.myY] > 0) {
            Board.myBotCollected[Board.board[Board.myX][Board.myY]-1] = Board.myBotCollected[Board.board[Board.myX][Board.myY]-1] + 0.5;
            Board.simpleBotCollected[Board.board[Board.oppX][Board.oppY]-1] = Board.simpleBotCollected[Board.board[Board.oppX][Board.oppY]-1] + 0.5;
            Board.board[Board.myX][Board.myY] = 0; 
        } else {
            if (myMove == TAKE && Board.board[Board.myX][Board.myY] > 0) {
                Board.myBotCollected[Board.board[Board.myX][Board.myY]-1]++;
                Board.board[Board.myX][Board.myY] = 0; 
            }
            if (simpleBotMove == TAKE && Board.board[Board.oppX][Board.oppY] > 0) {
                Board.simpleBotCollected[Board.board[Board.oppX][Board.oppY]-1]++;
                Board.board[Board.oppX][Board.oppY] = 0; 
            }
        }
        if (myMove == NORTH) {
            if (Board.myY - 1 >= 0) {
                Board.myY = Board.myY - 1;
            }
        }
        if (simpleBotMove == NORTH) {
            if (Board.oppY - 1 >= 0) {
                Board.oppY = Board.oppY - 1;
            }
        }
        if (myMove == SOUTH) {
            if (Board.myY + 1 < HEIGHT) {
                Board.myY = Board.myY + 1;
            }
        }
        if (simpleBotMove == SOUTH) {
            if (Board.oppY + 1 < HEIGHT) {
                Board.oppY = Board.oppY + 1;
            }
        }
        if (myMove == EAST) {
            if (Board.myX + 1 < WIDTH) {
                Board.myX = Board.myX + 1;
            }
        }
        if (simpleBotMove == EAST) {
            if (Board.oppX + 1 < WIDTH) {
                Board.oppX = Board.oppX + 1;
            }
        }
        if (myMove == WEST) {
            if (Board.myX - 1 >= 0) {
                Board.myX = Board.myX - 1;
            }
        }
        if (simpleBotMove == WEST) {
            if (Board.oppX - 1 >= 0) {
                Board.oppX = Board.oppX - 1;
            }
        }

        if (Board.myX == Board.oppX && Board.myY == Board.oppY) {
            Board.history[Board.myX][Board.myY] = 3;
        } else {
            Board.history[Board.myX][Board.myY] = 1;
            Board.history[Board.oppX][Board.oppY] = 2;
        }


    },
    noMoreItems: function() {
        for (var i=0; i<WIDTH; i++) {
            for (var j=0; j<HEIGHT; j++) {
                if (Board.board[i][j] != 0) {
                    return false;
                }
            }
        }
        return true;
    }
}

// Everything below is are API commands you can use.
// This, however, is not the actual API that's on the server
// but rather a working model of it for the purposes of giving
// you an environment to develop and debug in.

// don't rely on these constants to be the exact value listed here
var EAST = 1;
var NORTH = 2;
var WEST = 3;
var SOUTH = 4;
var TAKE = 5;
var PASS = 6;

var HEIGHT;
var WIDTH;

function has_item(i) {
    return i > 0;
}

function get_board() {
    return Board.board;
}

function get_number_of_item_types() {
    return Board.numberOfItemTypes;
}

function get_my_x() {
    return Board.myX;
}

function get_my_y() {
    return Board.myY;
}

function get_opponent_x() {
    return Board.oppX;
}

function get_opponent_y() {
    return Board.oppY;
}

function get_my_item_count(type) {
    return Board.myBotCollected[type-1];
}

function get_opponent_item_count(type) {
    return Board.simpleBotCollected[type-1];
}

function get_total_item_count(type) {
    return Board.totalItems[type-1];
}

function trace(mesg) {
    console.log(mesg);
}
