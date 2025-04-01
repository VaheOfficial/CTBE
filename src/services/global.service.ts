import Global from "../models/global.model";

export const globalCleanUp = async () => {
    console.log("Running globalCleanUp");
    const global = await Global.find();
    if (global.length > 0) {
        for(const g of global) {
            if(Date.now() >= g.timeoutStop.getTime()) {
                await g.deleteOne(g._id);
            }
        }
    }
}