const fs = require('fs');

function setCellOverride(xml, ref, value) {
    const emptyPattern = new RegExp(`<c r="${ref}"((?:\\s+[^>]*?)?)\\s*/>`, "g");
    const fullPattern = new RegExp(`<c r="${ref}"((?:\\s+[^>]*?)?)>[\\s\\S]*?</c>`, "g");

    let result = xml;
    let replaced = false;

    // TRY EMPTY PATTERN FIRST
    result = result.replace(emptyPattern, (_, attrs) => {
        replaced = true;
        const cleanAttrs = attrs.replace(/\s+t="[^"]*"/g, "");
        if (!value) return `<c r="${ref}"${cleanAttrs}/>`;
        return `<c r="${ref}"${cleanAttrs} t="inlineStr"><is><t>${value}</t></is></c>`;
    });

    if (!replaced) {
        // Try full pattern
        result = result.replace(fullPattern, (_, attrs) => {
            const cleanAttrs = attrs.replace(/\s+t="[^"]*"/g, "");
            if (!value) return `<c r="${ref}"${cleanAttrs}/>`;
            return `<c r="${ref}"${cleanAttrs} t="inlineStr"><is><t>${value}</t></is></c>`;
        });
    }

    return result;
}

const testXml = `<c r="B33" s="290" /><c r="C33" t="inlineStr"><is><t>Hello</t></is></c>`;
console.log("Before: ", testXml);
console.log("After : ", setCellOverride(testXml, "B33", "June"));

const testXml2 = `<c r="B33" s="290"><v>1</v></c><c r="C33" s="291"/>`;
console.log("Before: ", testXml2);
console.log("After : ", setCellOverride(testXml2, "B33", "June"));

