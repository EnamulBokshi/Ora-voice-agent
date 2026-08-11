export declare class EncryptionUtil {
    private static readonly ALGORITHM;
    private static readonly KEY;
    private static getKey;
    static encrypt(text: string): string;
    static decrypt(cipherText: string): string;
}
