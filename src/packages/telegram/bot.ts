
import { Telegraf } from "telegraf";
import { withdrawTokens } from "../arbitrage/withdraw";
import { TG_USERS } from "../config";
import { helpMessage, txMessage } from "./messages";

const bot = new Telegraf(process.env.BOT_TOKEN!);
bot.launch()

export const sendNotification = async (message: any) => {
    TG_USERS.forEach(chat => {
        bot.telegram.sendMessage(chat, message, {
            parse_mode: "HTML",
            disable_web_page_preview: true
        }).then(() => {
            console.log("Message sent successfully ")
        })
            .catch((error: any) => {
                console.log("Error while sending notification to ", chat)
                console.log(error)
            })
    })
};


const main = async () => {

    bot.help((ctx: any) => {
        console.log("Help ", helpMessage())
        ctx.reply(helpMessage())
    })

    bot.on("text", async (ctx: any) => {

        try {

            const text: any = ctx.message?.text ? ctx.message?.text : ctx.update.message.text || "";
            let details = text.split(",");

            console.log("\n\n TG Command : ", text)

            details = details.map((items: string) => {
                return items.trim();
            })

            let user: string = ctx.from.id.toString()
            if (TG_USERS.includes(user)) {

                console.log(details, details.length)
                if (details.length < 2) {
                    let error = "Invalid command click on /help to see a list of supported commands"

                    ctx.reply(error)
                } else {

                    let action = details[0].toLowerCase().trim()
                    let token = details[1].toLowerCase().trim()
                    let amount = details[2].toLowerCase().trim()
                    let slippage = details[3]

                    console.log(` token: ${token} \namount: ${amount} \nslippage ${slippage} \naction: ${action}`)

                    if (action && action.toLowerCase() == "withdraw") {

                        ctx.reply("Processing your withdraw request")

                        if (token && amount && slippage) {
                            const tx = await withdrawTokens(token, amount, slippage)
                            console.log("Transaction : ", tx)

                            if (tx && tx.status) {
                                ctx.reply(txMessage(tx.hash!))

                            } else if (tx && !tx.status && tx.reason) {
                                let message = "Withdraw failed "
                                message += "\n\n Reason: "
                                message += `\n${tx.reason}`

                                ctx.reply(message)
                            } else {
                                let message = "Withdraw failed "
                                message += "\n\n Reason: "
                                message += `\n${tx!.error!} `

                                ctx.reply(message)
                            }

                        } else {
                            let error = "Error, you did not pass all supported parameters"
                            ctx.reply(error)
                        }
                    } else {
                        ctx.reply("Invalid command click on /help to see a list of supported commands")
                    }
                }

            } else {
                const message = "Not authorized to make request"
                ctx.reply(message)
            }

        } catch (error) {
            console.log("Error while processing TG command : ", error)
        }
    })
}



main()

