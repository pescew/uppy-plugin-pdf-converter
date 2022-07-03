import {BasePlugin} from '@uppy/core'
const pdfjs = require("pdfjs-dist");

export default class PDFConverter extends BasePlugin {
    constructor(uppy, opts) {
        const defaultOptions = {
            type: "image/webp",
            quality: .8,
            maxPages: 50,
            width: 0,
            height: 0,
            minWidth: 2048,
            minHeight: 2048,
            maxWidth: 4096,
            maxHeight: 4096,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            dontFlip: false,
        }
        super(uppy, {...defaultOptions, ...opts})

        this.id = opts.id || 'PDFConverter'
        this.type = 'modifier'
        if (this.opts.rotation % 90 > 0) this.opts.rotation = 0

        this.defaultLocale = {
            strings: {
                PDFtoImage: 'Converting PDF to image...'
            },
        }

        pdfjs.GlobalWorkerOptions.workerPort = new Worker(
            new URL('./worker.js', import.meta.url),
            {type: 'module'},
        );

        this.i18nInit()
    }

    renderPage(page, options) {
        return new Promise((resolve, reject) => {
            let pdfOpts = {
                scale: 1,
                rotation: options.rotation,
                offsetX: options.offsetX,
                offsetY: options.offsetY,
                dontFlip: options.dontFlip
            }

            let nativeViewPort = page.getViewport(pdfOpts)
            let nativeWidth = nativeViewPort.width
            let nativeHeight = nativeViewPort.height

            if (options.width > 0) {
                pdfOpts.scale = options.width / nativeWidth
            } else if (options.height > 0) {
                pdfOpts.scale = options.height / nativeHeight
            } else {
                if (nativeWidth > options.maxWidth && options.maxWidth > 0) {
                    pdfOpts.scale = options.maxWidth / nativeWidth
                }
                if (nativeHeight * pdfOpts.scale > options.maxHeight && options.maxHeight > 0) {
                    pdfOpts.scale = options.maxHeight / nativeHeight
                }

                if (nativeWidth < options.minWidth && options.minWidth > 0) {
                    pdfOpts.scale = options.minWidth / nativeWidth
                }
                if (nativeHeight * pdfOpts.scale < options.minHeight && options.minHeight > 0) {
                    pdfOpts.scale = options.minHeight / nativeHeight
                }
            }

            let viewport = page.getViewport(pdfOpts);
            let canvas = document.createElement('canvas');
            let context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            let renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            let renderTask = page.render(renderContext);
            renderTask.promise.then(function () {
                canvas.toBlob(function (blob) {
                    return resolve(blob);
                }, options.type, options.quality);
            });


        })
    }

    handlePDF = (files) => {
        const promises = files.map((file) => {
            var fileID = file.id

            if (file.type != "application/pdf") {
                return
            }

            this.uppy.emit('preprocess-progress', file, {
                mode: 'indeterminate',
                message: this.i18n('PDFtoImage'),
            })

            file.data.arrayBuffer().then(array => {
                pdfjs.getDocument(array).promise.then(pdf => {
                    let numberOfPagesToRender = pdf.numPages
                    if (this.opts.maxPages < numberOfPagesToRender) {
                        this.uppy.log(`[PDF Converter] PDF file ${fileID} has more pages (${numberOfPagesToRender}) than maxPages (${this.opts.maxPages}).  Limiting to ${this.opts.maxPages}.`)
                        numberOfPagesToRender = this.opts.maxPages
                    }

                    var pageList = []
                    for (let i = 1; i <= numberOfPagesToRender; i++) {
                        pageList[i] = i
                    }

                    const extension = this.opts.type.split("/").pop()
                    let newDataName, newMetaName
                    file.data.name.endsWith(".pdf") ? newDataName = file.data.name.substring(0, file.data.name.length - 4) : newDataName = file.data.name
                    file.meta.name.endsWith(".pdf") ? newMetaName = file.meta.name.substring(0, file.meta.name.length - 4) : newMetaName = file.meta.name
                    var promiseList = pageList.map((pgNum) => {
                        pdf.getPage(pgNum).then(page => {
                            return this.renderPage(page, this.opts).then((imageBlob) => {
                                let fID = this.uppy.addFile({
                                    name: newDataName + "-pg" + pgNum + "." + extension,
                                    type: imageBlob.type,
                                    data: imageBlob,
                                    meta: {
                                        name: newMetaName + "-pg" + pgNum + "." + extension,
                                        type: imageBlob.type
                                    },
                                    // size: imageBlob.size,
                                    // source: 'Local',
                                    // isRemote: false,
                                })
                                this.uppy.log(`[PDF Converter] Converted page #${pgNum} of file ${fileID}. Size: ${imageBlob.size}`)
                            }).catch((err) => {
                                this.uppy.log(`[PDF Converter] Failed to convert page #${pgNum} of file ${fileID}:`, 'warning')
                                this.uppy.log(err, 'warning')
                            })
                        })
                    })
                    return Promise.all(promiseList)
                })
            })
        })

        return Promise.all(promises)
    }

    install() {
        this.uppy.setOptions({
            onBeforeFileAdded: (currentFile, files) => {
                if (currentFile.type == "application/pdf") {
                    this.handlePDF([currentFile]).then((value) => {
                        if (currentFile.type == "application/pdf") {
                            this.uppy.removeFile(currentFile.id);
                        }
                    });
                }
            },
        })
    }

    uninstall() {
        this.uppy.setOptions({
            onBeforeFileAdded: (currentFile, files) => {
                return
            },
        })
    }
}
