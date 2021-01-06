import React from 'react';
import './styles/App.css';
import ImageToolbar from "./components/ImageToolbar";

class App extends React.Component {
    private iframe!: HTMLIFrameElement;
    componentDidMount() {
        this.iframe = document.getElementById("editor") as HTMLIFrameElement;
    }

    postMessage = (data: any) => {
        if (this.iframe && this.iframe.contentWindow) {
            data["_fromVscode"] = true; // fake _fromVscode for now
            this.iframe.contentWindow.postMessage(data, "*");
        }
    }

    onMouseEnter = () => {
        this.iframe?.contentWindow?.focus();
    }

    render() {
        return (
            <div className="app">
                <iframe id="editor"
                        onMouseEnter={this.onMouseEnter}
                        title="MakeCode Arcade sprite editor"
                        src="https://arcade.makecode.com/beta--asseteditor"/>
                <ImageToolbar postMessage={this.postMessage}/>
            </div>
        );
    }
}

export default App;
