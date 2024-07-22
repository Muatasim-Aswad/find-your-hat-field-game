const prompt = require('prompt-sync')({ sigint: true });

const hat = '▲';
const hole = 'O';
const fieldChar = '░';
const pathChar = '*';
const currentChar = 'x';
const isHat = (char) => {
  return char === hat;
};
const isHole = (char) => {
  return char === hole;
};
const isPath = (char) => {
  return char === pathChar;
};
const isField = (char) => {
  return char === fieldChar;
};
const isCurrent = (char) => {
  return char === currentChar;
};
const isOutside = (location, rows, columns) => {
  return !(
    location.row >= 0 &&
    location.row < rows &&
    location.column >= 0 &&
    location.column < columns
  );
};

class FieldGame {
  #gameField;
  #currentLocation;
  #previousLocation;

  constructor(gameField) {
    this.#gameField = [...gameField];
    this.#currentLocation = {
      row: 0,
      column: 0,
    };
  }

  print() {
    process.stdout.write('\x1Bc');
    console.log(`\nFind the ${hat}, avoid holes, typos or going out. \n`);
    this.#gameField.forEach((row) => console.log(row.join('')));
    process.stdout.write(`\n`);
  }

  changeCurrentLocation(direction) {
    if (!isValidInput()) {
      console.log('Wrong command!');
      return;
    }
    direction = direction.toLowerCase();
    this.#previousLocation = { ...this.#currentLocation };

    const moves = {
      u: () => this.#currentLocation.row--,
      d: () => this.#currentLocation.row++,
      l: () => this.#currentLocation.column--,
      r: () => this.#currentLocation.column++,
    };
    moves[direction]();

    return this.resultOfLocationChange();

    //functions
    function isValidInput() {
      if (typeof direction !== 'string' || !direction || direction.length !== 1)
        return false;

      const validInputs = ['u', 'd', 'l', 'r'];
      if (!validInputs.includes(direction.toLowerCase())) return false;

      return true;
    }
  }

  resultOfLocationChange() {
    const { row: currentRow, column: currentColumn } = this.#currentLocation; //current point
    const { row: previousRow, column: previousColumn } = this.#previousLocation; //previous point

    const gameField = this.#gameField;
    const rows = gameField.length;
    const columns = gameField[0].length;
    const char = gameField[currentRow][currentColumn];
    let result;

    if (isOutside(this.#currentLocation, rows, columns)) {
      result = 'went out of';
    } else {
      result = isHole(char) ? 'lost' : isHat(char) ? 'won' : 'continue';
    }

    if (result === 'continue') {
      gameField[previousRow][previousColumn] = isPath(char)
        ? fieldChar //for backward movement
        : pathChar; //for forward movement

      gameField[currentRow][currentColumn] = currentChar;
      this.print();
    } else {
      console.clear();
      console.log(`\nYou ${result} the game!`);
    }

    return result;
  }

  static pathLength = 0;

  static startPlay() {
    let rows = 10;
    let columns = 20;
    let result = 0;
    let isAgain;
    console.log(
      `\nYou lost your hat in a field. Navigate your way to find it. \nBe careful of holes, typos, or going out of bounds. \nThe harder the field is, the more points you get.\n`,
    );
    do {
      const isWon = newGame();
      if (isWon)
        result += Math.round(rows * columns + FieldGame.pathLength * 2);

      console.log(`You have ${result} points.\n`);
      isAgain = prompt('Would you like to play again? y/n  ');
    } while (isAgain === 'y');

    //functions
    function newGame() {
      const isToChangeGameFieldSize = prompt(
        `The default game field is ${rows} x ${columns}, wanna change? y/n  `,
      );

      if (isToChangeGameFieldSize === 'y') changeGameFieldSize();

      const generatedGameField = FieldGame.createFieldArr(rows, columns);
      const game = new FieldGame(generatedGameField);

      game.print();

      return play(game);

      //helper function
      function changeGameFieldSize() {
        console.log('You cannot set them less than 5.');

        const rowsInput = Math.ceil(Number(prompt('How many rows?  ')));
        const columnsInput = Math.ceil(Number(prompt('How many columns?  ')));

        rows = isValid(rowsInput) ? rowsInput : 10;
        columns = isValid(columnsInput) ? columnsInput : 20;

        //functions
        function isValid(number) {
          return number && typeof number === 'number' && number > 4;
        }
      }

      function play(game) {
        let result;
        do {
          const direction = prompt(
            'What is your next move? u d l r , or n to close  ',
          );
          if (direction === 'n') break;
          result = game.changeCurrentLocation(direction);
        } while (result === 'continue');
        return result === 'won';
      }
    }
  }

  static createFieldArr(rows, columns) {
    isValidInput();
    const gameField = initializeField();
    addRandomPath();

    return gameField;

    //functions

    function isValidInput() {
      if (typeof rows !== 'number' || typeof columns !== 'number') {
        throw new Error('It should be a number.');
      }
    }
    function initializeField() {
      const gameField = Array.from({ length: rows }, () =>
        Array.from({ length: columns }, () => randomChar()),
      ); //create the array and randomly fill with 'o' or '░'

      gameField[0][0] = currentChar; //set the starting point

      const { randomRow, randomColumn } = randomRowColumn(); //randomly place the target '^'

      gameField[randomRow][randomColumn] = hat;

      return gameField;
    }
    function addRandomPath() {
      const location = {
        row: 0,
        column: 0,
      };
      const trackPath = [
        {
          row: 0,
          column: 0,
          char: pathChar,
        },
      ];

      let reached = false;
      while (!reached) {
        const previousLocation = { ...location }; //save location before change

        const rowOrColumn = Object.keys(location)[randomBinary()]; //move randomly
        randomBinary() ? location[rowOrColumn]++ : location[rowOrColumn]--;

        //evaluate movement result
        if (isOutside(location, gameField.length, gameField[0].length)) {
          Object.assign(location, previousLocation); //if out of bounds restore
        } else {
          const intersectionIndex = isRevisited(); //remove circular paths
          if (intersectionIndex !== -1) {
            cancelPath(intersectionIndex);
          }

          let neighborIndex = isNeighborToRevisited(); //remove paths unnecessarily longer than 2
          let counter = 0;
          while (
            neighborIndex !== -1 &&
            trackPath.length - neighborIndex > 2 &&
            counter < 5
          ) {
            cancelPath(neighborIndex + 1);
            neighborIndex = isNeighborToRevisited();
            counter++;
          }

          const char = gameField[location.row][location.column];
          if (isHat(char)) {
            reached = true;
          } else if (isHole(char) || isField(char)) {
            addToPathTrack(char);
            gameField[location.row][location.column] = fieldChar;
          }
        }
      }

      FieldGame.pathLength = trackPath.length;
      //helper functions
      function addToPathTrack(char) {
        trackPath.push({
          row: location.row,
          column: location.column,
          char,
        });
      }
      function isRevisited() {
        return trackPath.findIndex(
          (point) =>
            point.row === location.row && point.column === location.column,
        );
      }
      function cancelPath(index) {
        //restore defaults of the loop points
        trackPath
          .slice(index)
          .forEach(
            (point) => (gameField[point.row][point.column] = point.char),
          );
        //delete the loop from the path
        trackPath.splice(index);
      }
      function isNeighborToRevisited() {
        return trackPath.findIndex(
          (point) =>
            (point.row === location.row &&
              Math.abs(point.column - location.column) === 1) ||
            (point.column === location.column &&
              Math.abs(point.row - location.row) === 1),
        );
      }
    }
    function randomRowColumn() {
      const randomRow = randomNumber(rows - 1, Math.round(rows / 2));
      const randomColumn = randomNumber(columns - 1, Math.round(rows / 3));
      return {
        randomRow,
        randomColumn,
      };
    }
    function randomChar() {
      return randomBinary() ? hole : fieldChar;
    }
    function randomBinary() {
      return randomNumber(1);
    }
    function randomNumber(max, min = 0) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  }
}

FieldGame.startPlay();

/*const trialField = [
    ['*', '░', '░', 'O', '░'],
    ['O', '░', '░', '░', 'O'],
    ['░', '░', 'O', 'O', '░'],
    ['░', 'O', '░', '░', 'O'],
    ['░', '░', '░', '^', '░'],
  ];*/

/*function countHoles(arr, minPercentage = 30) {
      const holeNumbers = arr.reduce((sum, row) => {
        const rowSum = row.reduce((sum, char) => {
          if (isHole(char)) sum++;
          return sum;
        }, 0);
        return sum + rowSum;
      }, 0);

      const elementNumbers = arr.length * arr[0].length;
      const holePercentage = Math.round((holeNumbers * 100) / elementNumbers);
      return holePercentage > minPercentage;
    }*/
