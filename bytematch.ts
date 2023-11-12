export function findPythonByteObjects(input: string): Uint8Array|null {
    // Regular expression pattern to match Python byte literals b'...'
    const byteObjectPattern = /b'([^']*)'/g;

    // This function converts the hex string to a byte array
    const hexToBytes = (hexString: string): Uint8Array => {
        const bytes = new Uint8Array(hexString.length / 2);
        for (let i = 0; i < hexString.length; i += 2) {
            bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
        }
        return bytes;
    };

    let match;
    const byteArrays: Uint8Array[] = [];

    // Use the regular expression to find all byte literals in the input string
    while ((match = byteObjectPattern.exec(input)) !== null) {
        // Convert the contents of the byte literal (escape sequences) to raw bytes
        const byteString = match[1].replace(/\\x([a-fA-F0-9]{2})/g, "$1");
        
        // Convert the byte string to a byte array and add it to the results
        byteArrays.push(hexToBytes(byteString));
    }

    return byteArrays.length > 0 ? byteArrays[0] : null;
}

