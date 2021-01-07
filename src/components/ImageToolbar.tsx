import React from 'react';
import {
    Bitmap,
    bitmapToImageLiteral,
    getJRESImageFromDataString,
    getJRESImageFromImageLiteral,
    jresDataToBitmap,
    JRESImage
} from '../images'
import {arcadePalette} from '../share';
import '../styles/ImageToolbar.css';

interface ImageToolbarProps {
    postMessage: (msg: any) => void;
}

interface ImageToolbarState {
    item: JRESImage;
    saving?: number;
}

const DEFAULT_JRES = {
    data: "hwQQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
    previewURI: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAH0lEQVQ4T2NkoBAwUqifYdQAhtEwYBgNA1A+Gvi8AAAmmAARf9qcXAAAAABJRU5ErkJggg==",
    width: 16,
    height: 16,
}

const STORAGE_KEY = "SPRITE_DATA"
const SAVE_INTERVAL = 2000; // autosave every 2s

class ImageToolbar extends React.Component<ImageToolbarProps, ImageToolbarState> {
    private _item: JRESImage;

    constructor(props: ImageToolbarProps) {
        super(props);

        const storedJson = window.localStorage.getItem(STORAGE_KEY);
        try {
            const storedItems = storedJson && JSON.parse(storedJson) as JRESImage;
            this._item = storedItems || {...DEFAULT_JRES};
        } catch {
            this._item = {...DEFAULT_JRES};
        }

        this.state = {
            item: this._item,
            saving: undefined
        };
    }

    componentDidMount() {
        window.addEventListener("message", this.handleMessage);
        this.loadJres(this._item);

        // TODO: intermittent bug where floating layers are not registered
        // in the "update" probably to do with pxt-side handling of getJres
        setTimeout(this.autosaveJres, SAVE_INTERVAL);
    }

    componentWillUnmount() {
        window.removeEventListener("message", this.handleMessage);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this._item));
    }

    componentDidUpdate(prevProps: ImageToolbarProps, prevState: ImageToolbarState) {
        // if (this.state.saving !== undefined && prevState.saving === undefined) {
        //     this.getJres();
        // }

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this._item));
    }

    handleMessage = (msg: any) => {
        const data = msg.data;
        switch (data.type) {
            case "ready":
                this.loadJres(this._item);
                break;
            case "update":
                const jresImage = getJRESImageFromDataString(data.message, arcadePalette);
                this._item = jresImage;
                break;
            default:
                break;
        }
    }

    autosaveJres = () => {
        if (!this.state.saving) this.getJres();
        setTimeout(this.autosaveJres, SAVE_INTERVAL);
    }

    loadJres = (jresImage: JRESImage) => {
        this.props.postMessage({type: "initialize", message: jresImage.data});
    }

    getJres = () => {
        this.props.postMessage({type: "update"});
    }

    copyToClipboard = () => {
        let bitmap = jresDataToBitmap(this._item.data)
        const imageString = bitmapToImageLiteral(bitmap, "typescript");

        const stubForCopy = document.createElement('textarea');
        stubForCopy.value = imageString;
        stubForCopy.setAttribute('readonly', '');
        stubForCopy.style.position = 'absolute';
        stubForCopy.style.left = '-9999px';
        document.body.appendChild(stubForCopy);
        stubForCopy.select();
        document.execCommand('copy');
        document.body.removeChild(stubForCopy);
    }

    _transformImpl(transformer: (bitmap: Bitmap) => Bitmap) {
        this.getJres()
        setTimeout(() => {
            // 1. rotate this._item.data;
            let bitmap = jresDataToBitmap(this._item.data)

            let result = transformer(bitmap)
            const imageString = bitmapToImageLiteral(result, "typescript");

            // 2. post initialize message to update editor
            const jresImage = getJRESImageFromImageLiteral(imageString, arcadePalette);
            this._item = jresImage
            this.props.postMessage({type: "initialize", message: jresImage.data});
        }, 50)

    }

    onClockwiseRotateButtonClick = () => {
        this._transformImpl(this.rotateClockwise)
    }

    onCounterClockwiseRotateButtonClick = () => {
        this._transformImpl(this.rotateCounterClockwise)
    }

    onHorizontalFlipButtonClick = () => {
        this._transformImpl(this.horizontalFlip)
    }

    onVerticalFlipButtonClick = () => {
        this._transformImpl(this.verticalFlip)
    }

    render() {
        const {item} = this.state;

        return <div id="image-toolbar">
            <div className="image-toolbar-buttons">
                <div className="image-button" title="Rotate 90" onClick={this.onClockwiseRotateButtonClick}>
                    <i className="icon redo"></i>
                </div>
                <div className="image-button" title="Rotate 270" onClick={this.onCounterClockwiseRotateButtonClick}>
                    <i className="icon undo"></i>
                </div>
                <div className="image-button" title="Horizontal flip" onClick={this.onHorizontalFlipButtonClick}>
                    <i className="icon arrows alternate horizontal icon"></i>
                </div>
                <div className="image-button" title="Vertical flip" onClick={this.onVerticalFlipButtonClick}>
                    <i className="icon arrows alternate vertical icon"></i>
                </div>
                <div className="image-button" title="Copy to clipboard" onClick={this.copyToClipboard}>
                    <i className="icon copy outline"></i>
                </div>
            </div>
        </div>
    }

    private rotateClockwise(bitmap: Bitmap) {
        let result = new Bitmap(bitmap.height, bitmap.width)
        for (let w = 0; w < bitmap.width; w++) {
            for (let h = 0; h < bitmap.height; h++) {
                result.set(bitmap.height - 1 - h, w, bitmap.get(w, h))
            }
        }
        return result
    }

    private rotateCounterClockwise(bitmap: Bitmap) {
        let result = new Bitmap(bitmap.height, bitmap.width)
        for (let w = 0; w < bitmap.width; w++) {
            for (let h = 0; h < bitmap.height; h++) {
                result.set(h, bitmap.width - 1 - w, bitmap.get(w, h))
            }
        }
        return result
    }

    private verticalFlip(bitmap: Bitmap) {
        let result = new Bitmap(bitmap.width, bitmap.height)
        for (let h = 0; h < bitmap.height; h++) {
            for (let w = 0; w < bitmap.width; w++) {
                result.set(w, bitmap.height - 1 - h, bitmap.get(w, h))
            }
        }
        return result
    }

    private horizontalFlip(bitmap: Bitmap) {
        let result = new Bitmap(bitmap.width, bitmap.height)
        for (let h = 0; h < bitmap.height; h++) {
            for (let w = 0; w < bitmap.width; w++) {
                result.set(bitmap.width - 1 - w, h, bitmap.get(w, h))
            }
        }
        return result
    }


}

export default ImageToolbar
