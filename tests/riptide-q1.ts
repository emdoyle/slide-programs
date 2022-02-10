import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { RiptideQ1 } from "../target/types/riptide_q1";
import { assert, expect } from "chai";

async function setup(program) {
  const gameKeypair = anchor.web3.Keypair.generate();
  const playerOne = program.provider.wallet; // from Anchor.toml, this is also the payer so wallet needs funds
  const playerTwo = anchor.web3.Keypair.generate();
  await program.rpc.setupGame(playerTwo.publicKey, {
    accounts: {
      game: gameKeypair.publicKey,
      playerOne: playerOne.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
    signers: [gameKeypair], // playerOne automatically included as a signer because it is listed as the provider
  });
  return {
    gameKeypair,
    playerOne,
    playerTwo,
  };
}

async function createSetupInstruction(program) {
  const gameKeypair = anchor.web3.Keypair.generate();
  const playerOne = program.provider.wallet; // from Anchor.toml, this is also the payer so wallet needs funds
  const playerTwo = anchor.web3.Keypair.generate();
  const instruction = await program.instruction.setupGame(playerTwo.publicKey, {
    accounts: {
      game: gameKeypair.publicKey,
      playerOne: playerOne.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
  });
  return {
    instruction,
    gameKeypair,
    playerOne,
    playerTwo,
  };
}

async function playFirstMove(
  program,
  tile,
  expectedTurn,
  expectedGameState,
  expectedBoard
) {
  const {
    instruction: setupInstruction,
    gameKeypair,
    playerOne,
  } = await createSetupInstruction(program);
  await program.rpc.play(tile, {
    preInstructions: [setupInstruction],
    accounts: {
      player: playerOne.publicKey,
      game: gameKeypair.publicKey,
    },
    signers: [gameKeypair], // playerOne automatically included as a signer because it is listed as the provider
  });

  const gameState = await program.account.game.fetch(gameKeypair.publicKey);
  expect(gameState.turn).to.equal(expectedTurn);
  expect(gameState.state).to.eql(expectedGameState);
  expect(gameState.board).to.eql(expectedBoard);
}

async function play(
  program,
  game,
  player,
  tile,
  expectedTurn,
  expectedGameState,
  expectedBoard
) {
  await program.rpc.play(tile, {
    accounts: {
      player: player.publicKey,
      game,
    },
    signers: player instanceof (anchor.Wallet as any) ? [] : [player], // don't pass second copy of provider wallet
  });

  const gameState = await program.account.game.fetch(game);
  expect(gameState.turn).to.equal(expectedTurn);
  expect(gameState.state).to.eql(expectedGameState);
  expect(gameState.board).to.eql(expectedBoard);
}

async function createPlayInstruction(program, game, player, tile) {
  return await program.instruction.play(tile, {
    accounts: {
      player: player.publicKey,
      game,
    },
  });
}

async function setupAndPlayAsPostInstructions(
  program,
  gameKeypair,
  playerOne,
  playerTwo,
  instructions,
  expectedTurn,
  expectedGameState,
  expectedBoard
) {
  await program.rpc.setupGame(playerTwo.publicKey, {
    accounts: {
      game: gameKeypair.publicKey,
      playerOne: playerOne.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
    postInstructions: instructions,
    signers: [gameKeypair, playerTwo],
  });

  const gameState = await program.account.game.fetch(gameKeypair.publicKey);
  expect(gameState.turn).to.equal(expectedTurn);
  expect(gameState.state).to.eql(expectedGameState);
  expect(gameState.board).to.eql(expectedBoard);
}

describe("riptide-q1", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.RiptideQ1 as Program<RiptideQ1>;

  it("setup game sets state correctly", async () => {
    const { gameKeypair, playerOne, playerTwo } = await setup(program);
    let gameState = await program.account.game.fetch(gameKeypair.publicKey);
    expect(gameState.turn).to.equal(1);
    expect(gameState.players).to.eql([
      playerOne.publicKey,
      playerTwo.publicKey,
    ]);
    expect(gameState.state).to.eql({ active: {} });
    expect(gameState.board).to.eql([
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ]);
  });

  it("should setup game as pre-instruction and play one move", async () => {
    await playFirstMove(program, { row: 2, column: 2 }, 2, { active: {} }, [
      [null, null, null],
      [null, null, null],
      [null, null, { x: {} }],
    ]);
  });

  it("player one wins", async () => {
    const { gameKeypair, playerOne, playerTwo } = await setup(program);
    await play(
      program,
      gameKeypair.publicKey,
      playerOne,
      { row: 0, column: 0 },
      2,
      { active: {} },
      [
        [{ x: {} }, null, null],
        [null, null, null],
        [null, null, null],
      ]
    );
    await play(
      program,
      gameKeypair.publicKey,
      playerTwo,
      { row: 0, column: 1 },
      3,
      { active: {} },
      [
        [{ x: {} }, { o: {} }, null],
        [null, null, null],
        [null, null, null],
      ]
    );
    await play(
      program,
      gameKeypair.publicKey,
      playerOne,
      { row: 1, column: 0 },
      4,
      { active: {} },
      [
        [{ x: {} }, { o: {} }, null],
        [{ x: {} }, null, null],
        [null, null, null],
      ]
    );
    await play(
      program,
      gameKeypair.publicKey,
      playerTwo,
      { row: 0, column: 2 },
      5,
      { active: {} },
      [
        [{ x: {} }, { o: {} }, { o: {} }],
        [{ x: {} }, null, null],
        [null, null, null],
      ]
    );
    await play(
      program,
      gameKeypair.publicKey,
      playerOne,
      { row: 2, column: 0 },
      5,
      { won: { winner: playerOne.publicKey } },
      [
        [{ x: {} }, { o: {} }, { o: {} }],
        [{ x: {} }, null, null],
        [{ x: {} }, null, null],
      ]
    );
  });

  it("should play entirely as post-instructions", async () => {
    const gameKeypair = anchor.web3.Keypair.generate();
    const playerOne = program.provider.wallet; // from Anchor.toml, this is also the payer so wallet needs funds
    const playerTwo = anchor.web3.Keypair.generate();
    const instructions = [
      await createPlayInstruction(program, gameKeypair.publicKey, playerOne, {
        row: 0,
        column: 0,
      }),
      await createPlayInstruction(program, gameKeypair.publicKey, playerTwo, {
        row: 0,
        column: 1,
      }),
      await createPlayInstruction(program, gameKeypair.publicKey, playerOne, {
        row: 1,
        column: 0,
      }),
      await createPlayInstruction(program, gameKeypair.publicKey, playerTwo, {
        row: 0,
        column: 2,
      }),
      await createPlayInstruction(program, gameKeypair.publicKey, playerOne, {
        row: 2,
        column: 0,
      }),
    ];
    await setupAndPlayAsPostInstructions(
      program,
      gameKeypair,
      playerOne,
      playerTwo,
      instructions,
      5,
      { won: { winner: playerOne.publicKey } },
      [
        [{ x: {} }, { o: {} }, { o: {} }],
        [{ x: {} }, null, null],
        [{ x: {} }, null, null],
      ]
    );
  });

  it("should throw error for tile out of bounds", async () => {
    const { gameKeypair, playerOne } = await setup(program);
    try {
      await play(
        program,
        gameKeypair.publicKey,
        playerOne,
        { row: 5, column: 1 }, // out of bounds row
        4,
        { active: {} },
        [
          [null, null, null],
          [null, null, null],
          [null, null, null],
        ]
      );
      // we use this to make sure we definitely throw an error
      assert(false, "should've failed but didn't ");
    } catch (error) {
      expect(error.code).to.equal(6000);
    }
  });
});
