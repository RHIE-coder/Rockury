import { CHANNELS } from "./channels";

export interface IEvents {
    // Window Management
    [CHANNELS.GET_APP_VERSION]: {
        args: void,
        response: {success: boolean; version: string};
    };
}