import jimp from "jimp";
import * as path from "path";
import * as fs from "fs";
import Table from "cli-table";

const BOUNDARY_COLOR = 3978044671;
const WURM_COLOR = 255;

type ImagePixels = number[][];

function berechneDurchschnitt(list: number[]) {
    return list.reduce((a, b) => a + b) / list.length;
}

function berechneStandardAbweichung (list: number[]) {
    return Math.sqrt(berechneVarianz(list));
}

function berechneVarianz(list: number[]) {
    const durchschnitt = berechneDurchschnitt(list);
    return berechneDurchschnitt(list.map(x => Math.pow(x - durchschnitt, 2)));
}

async function readImage(fullPath: string) {
    const image = await jimp.read(fullPath);
    const pixels: ImagePixels = [];

    for (let x = 0; x < image.getWidth(); x++) {
        pixels[x] = [];
        for(let y = 0; y < image.getHeight(); y++) {
            image.getPixelColor(x, y, (err, color) => {
                pixels[x][y] = color;
            });
        }
    }

    return pixels;
}

function detectBoundaries(image: ImagePixels): number[] {
    const boundaries = [];

    for(let x = 0; x < image.length; x++) {
        const color = image[x][0];

        if(color === BOUNDARY_COLOR) {
            boundaries.push(x);
        }
    }

    return boundaries;
}

function detectMehlwürmer(image: ImagePixels): {x: number; y: number}[] {
    const wuermer = [];

    for(let x = 0; x < image.length; x++) {
        for(let y = 0; y < image[x].length; y++) {
            const color = image[x][y];

            if(color === WURM_COLOR) {
                wuermer.push({
                    x, y
                });
            }
        }
    }

    return wuermer;
}

function getWuermerTemperature(boundaries: number[], wuermer: {x: number; y: number}[]): number[] {
    const temperatures: number[] = [];

    wuermer.forEach(wurm => {
        const temperature = boundaries.filter((boundary: number) => boundary < wurm.x).length * 2 + 6;
        temperatures.push(temperature);
    });

    return temperatures;
}

async function main() {
    const imageDir = path.join(__dirname, "images");
    const allImages = fs.readdirSync(imageDir);

    const allImagesRead = await Promise.all(allImages.map(async (name): Promise<[name: string, image: ImagePixels]> => {
        return [name, await readImage(path.join(__dirname, "images", name))]
    }));

    const head = ["Datei Name", "Min Temperatur", "Max Temperatur", "Durchschnittstemperatur", "Standard Abweichung", "Varianz"]
    const table = new Table({
        head
    })

    allImagesRead.forEach(([name, image]) => {
        const boundaries = detectBoundaries(image);
        const wuermer = detectMehlwürmer(image);
        const temperatures = getWuermerTemperature(boundaries, wuermer);

        const minTemperatur = Math.min(...temperatures);
        const maxTemperatur = Math.max(...temperatures);
        const durchschnittTemperatur = berechneDurchschnitt(temperatures);
        const standardAbweichung = berechneStandardAbweichung(temperatures);
        const varianzTemperatur = berechneVarianz(temperatures);

        table.push([name, minTemperatur, maxTemperatur, durchschnittTemperatur, standardAbweichung, varianzTemperatur]);
    });

    console.log("CSV:");
    console.log([head, ...table].map(row => row.join(",")).join("\n"));
    console.log("\nTabelle:")
    console.log(table.toString());
}

main();