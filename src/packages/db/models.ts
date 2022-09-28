import { Schema, model } from "mongoose";
import { poolInterface, tokenInterface } from "../utils/types";



const PoolSchema = new Schema<poolInterface>(
  {
    lpAddress: { type: String, required: true, unique: true },
    token0: { type: String, required: true },
    token1: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);


const TokenSchema = new Schema<tokenInterface>(
  {
    address: { type: String, required: true, unique: true },
    symbol: { type: String, required: true, unique: true }
  },
  {
    timestamps: true,
  }
);

const Token = model<tokenInterface>("Token", TokenSchema);

const Pool = model<poolInterface>("Pool", PoolSchema);

export { Pool, Token };
