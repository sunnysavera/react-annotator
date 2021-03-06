// @flow weak
//working without pencil
import React, {
  useRef,
  useState,
  useLayoutEffect,
  useEffect,
  useMemo,
} from "react"
import type { Node } from "react"
import { Matrix } from "transformation-matrix-js"

import type {
  Region,
  Point,
  Polygon,
  Box,
  Keypoints,
  KeypointsDefinition,
} from "./region-tools.js"
import { makeStyles } from "@material-ui/core/styles"
import styles from "./styles"
import PreventScrollToParents from "../PreventScrollToParents"
import useWindowSize from "../hooks/use-window-size.js"
import useMouse from "./use-mouse"
import useProjectRegionBox from "./use-project-box"
import useExcludePattern from "../hooks/use-exclude-pattern"
import { useRafState } from "react-use"
import RegionSelectAndTransformBoxes from "../RegionSelectAndTransformBoxes"
import VideoOrImageCanvasBackground from "../VideoOrImageCanvasBackground"
import useEventCallback from "use-event-callback"
import RegionShapes from "../RegionShapes"


const useStyles = makeStyles(styles)

type Props = {
  regions: Array<Region>,
  imageSrc?: string,
  videoSrc?: string,
  videoTime?: number,
  keypointDefinitions?: KeypointDefinitions,
  onMouseMove?: ({ x: number, y: number }) => any,
  onMouseDown?: ({ x: number, y: number }) => any,
  onMouseUp?: ({ x: number, y: number }) => any,
  dragWithPrimary?: boolean,
  zoomWithPrimary?: boolean,
  createWithPrimary?: boolean,
  showTags?: boolean,
  realSize?: { width: number, height: number, unitName: string },
  showCrosshairs?: boolean,
  showMask?: boolean,
  pointDistancePrecision?: number,
  regionClsList?: Array<string>,
  regionTagList?: Array<string>,
  allowedArea?: { x: number, y: number, w: number, h: number },
  RegionEditLabel?: Node,
  videoPlaying?: boolean,
  zoomOnAllowedArea?: boolean,
  fullImageSegmentationMode?: boolean,
  autoSegmentationOptions?: Object,
  modifyingAllowedArea?: boolean,

  onChangeRegion: (Region) => any,
  onBeginRegionEdit: (Region) => any,
  onCloseRegionEdit: (Region) => any,
  onDeleteRegion: (Region) => any,
  onBeginBoxTransform: (Box, [number, number]) => any,
  onBeginMovePolygonPoint: (Polygon, index: number) => any,
  onBeginMoveKeypoint: (Keypoints, index: number) => any,
  onAddPolygonPoint: (Polygon, point: [number, number], index: number) => any,
  onSelectRegion: (Region) => any,
  onBeginMovePoint: (Point) => any,
  onImageOrVideoLoaded: ({
    naturalWidth: number,
    naturalHeight: number,
    duration?: number,
  }) => any,
  onChangeVideoTime: (number) => any,
  onRegionClassAdded: () => {},
  onChangeVideoPlaying?: Function,
}

const getDefaultMat = (allowedArea = null, { iw, ih } = {}) => {
  let mat = Matrix.from(1, 0, 0, 1, -10, -10)
  if (allowedArea && iw) {
    mat = mat
      .translate(allowedArea.x * iw, allowedArea.y * ih)
      .scaleU(allowedArea.w + 0.05)
  }
  return mat
}

export const ImageCanvas = ({
  regions,
  imageSrc,
  activeImage,
  videoSrc,
  videoTime,
  realSize,
  showTags,
  onRegionChange,
  onMouseMove = (p) => null,
  onMouseDown = (p) => null,
  onMouseUp = (p) => null,
  loader,
  dragWithPrimary = false,
  zoomWithPrimary = false,
  createWithPrimary = false,
  pointDistancePrecision = 0,
  onImageLoaded,
  onNewImageLoaded,
  regionClsList,
  regionTagList,
  showCrosshairs,
  allowedArea,
  RegionEditLabel = null,
  videoPlaying = false,
  showMask = true,
  fullImageSegmentationMode,
  autoSegmentationOptions,
  onImageOrVideoLoaded,
  onChangeRegion,
  onBeginRegionEdit,
  onCloseRegionEdit,
  onBeginBoxTransform,
  onBeginMovePolygonPoint,
  onAddPolygonPoint,
  onBeginMoveKeypoint,
  onSelectRegion,
  onBeginMovePoint,
  onDeleteRegion,
  onChangeVideoTime,
  onChangeVideoPlaying,
  onRegionClassAdded,
  zoomOnAllowedArea = true,
  modifyingAllowedArea = false,
  keypointDefinitions,
}: Props) => {
  const classes = useStyles()

  const canvasEl = useRef(null)
  const layoutParams = useRef({})
  const [dragging, changeDragging] = useRafState(false)
  const [maskImagesLoaded, changeMaskImagesLoaded] = useRafState(0)
  const [zoomStart, changeZoomStart] = useRafState(null)
  const [zoomEnd, changeZoomEnd] = useRafState(null)
  const [mat, changeMat] = useRafState(getDefaultMat())
  const maskImages = useRef({})
  const windowSize = useWindowSize()

  const getLatestMat = useEventCallback(() => mat)


  const { mouseEvents, mousePosition,zoomIn } = useMouse({
    canvasEl,
    dragging,
    mat,
    layoutParams,
    changeMat,
    zoomStart,
    zoomEnd,
    changeZoomStart,
    changeZoomEnd,
    changeDragging,
    zoomWithPrimary,
    dragWithPrimary,
    onMouseMove,
    onMouseDown,
    onMouseUp,
  })


  useLayoutEffect(() => changeMat(mat.clone()), [windowSize])

  const innerMousePos = mat.applyToPoint(
    mousePosition.current.x,
    mousePosition.current.y
  )

  const projectRegionBox = useProjectRegionBox({ layoutParams, mat })

  const [imageDimensions, changeImageDimensions] = useState()
  const imageLoaded = Boolean(imageDimensions && imageDimensions.naturalWidth)

  const onVideoOrImageLoaded = useEventCallback(
    ({ naturalWidth, naturalHeight, duration,width,height }) => {
      const dims = { naturalWidth, naturalHeight, duration,width,height }
      // console.log('DMS', dims);
      if (onImageOrVideoLoaded) onImageOrVideoLoaded(dims)
      changeImageDimensions(dims)
      // Redundant update to fix rerendering issues
      setTimeout(() => changeImageDimensions(dims), 10)
    }
  )





  const excludePattern = useExcludePattern()

  const canvas = canvasEl.current
  if (canvas && imageLoaded) {
    const { clientWidth, clientHeight } = canvas

    const fitScale = Math.max(
      imageDimensions.naturalWidth / (clientWidth - 20),
      imageDimensions.naturalHeight / (clientHeight - 20)
    )

    const [iw, ih] = [
      imageDimensions.naturalWidth / fitScale,
      imageDimensions.naturalHeight / fitScale,
    ]
    // console.log('iwih',iw, ih)
    layoutParams.current = {
      iw,
      ih,
      fitScale,
      canvasWidth: clientWidth,
      canvasHeight: clientHeight,
    }
  }

  useEffect(() => {
    if (!imageLoaded) return
    changeMat(
      getDefaultMat(
        zoomOnAllowedArea ? allowedArea : null,
        layoutParams.current
      )
    )
    onNewImageLoaded(mouseEvents)

    // eslint-disable-next-line
  }, [imageLoaded])

  useLayoutEffect(() => {
    if (!imageDimensions) return
    const { clientWidth, clientHeight } = canvas

    const context = canvas.getContext("2d")

    context.save()
    context.transform(...mat.clone().inverse().toArray())

    const { iw, ih } = layoutParams.current

    if (allowedArea) {
      // Pattern to indicate the NOT allowed areas
      const { x, y, w, h } = allowedArea
      context.save()
      context.globalAlpha = 1
      const outer = [
        [0, 0],
        [iw, 0],
        [iw, ih],
        [0, ih],
      ]
      const inner = [
        [x * iw, y * ih],
        [x * iw + w * iw, y * ih],
        [x * iw + w * iw, y * ih + h * ih],
        [x * iw, y * ih + h * ih],
      ]
      context.moveTo(...outer[0])
      outer.forEach((p) => context.lineTo(...p))
      context.lineTo(...outer[0])
      context.closePath()

      inner.reverse()
      context.moveTo(...inner[0])
      inner.forEach((p) => context.lineTo(...p))
      context.lineTo(...inner[0])

      context.fillStyle = excludePattern || "#f00"
      context.fill()

      context.restore()
    }

    context.restore()
  })

  const { iw, ih } = layoutParams.current

  let zoomBox =
    !zoomStart || !zoomEnd
      ? null
      : {
          ...mat.clone().inverse().applyToPoint(zoomStart.x, zoomStart.y),
          w: (zoomEnd.x - zoomStart.x) / mat.a,
          h: (zoomEnd.y - zoomStart.y) / mat.d,
        }
  if (zoomBox) {
    if (zoomBox.w < 0) {
      zoomBox.x += zoomBox.w
      zoomBox.w *= -1
    }
    if (zoomBox.h < 0) {
      zoomBox.y += zoomBox.h
      zoomBox.h *= -1
    }
  }

  const imagePosition = {
    topLeft: mat.clone().inverse().applyToPoint(0, 0),
    bottomRight: mat.clone().inverse().applyToPoint(iw, ih),
  }

  const highlightedRegion = useMemo(() => {
    const highlightedRegions = regions.filter((r) => r.highlighted)
    if (highlightedRegions.length !== 1) return null
    return highlightedRegions[0]
  }, [regions])

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        cursor: createWithPrimary
          ? "crosshair"
          : dragging
          ? "grabbing"
          : dragWithPrimary
          ? "grab"
          : zoomWithPrimary
          ? mat.a < 1
            ? "zoom-out"
            : "zoom-in"
          : undefined,
      }}
    >

      {imageLoaded && !dragging && (
        <RegionSelectAndTransformBoxes
          key="regionSelectAndTransformBoxes"
          regions={
            !modifyingAllowedArea || !allowedArea
              ? regions
              : [
                  {
                    type: "box",
                    id: "$$allowed_area",
                    cls: "allowed_area",
                    highlighted: true,
                    x: allowedArea.x,
                    y: allowedArea.y,
                    w: allowedArea.w,
                    h: allowedArea.h,
                    visible: true,
                    color: "#ff0",
                  },
                ]
          }
          mouseEvents={mouseEvents}
          projectRegionBox={projectRegionBox}
          dragWithPrimary={dragWithPrimary}
          createWithPrimary={createWithPrimary}
          zoomWithPrimary={zoomWithPrimary}
          onBeginMovePoint={onBeginMovePoint}
          onSelectRegion={onSelectRegion}
          layoutParams={layoutParams}
          mat={mat}
          onBeginBoxTransform={onBeginBoxTransform}
          onBeginMovePolygonPoint={onBeginMovePolygonPoint}
          onBeginMoveKeypoint={onBeginMoveKeypoint}
          onAddPolygonPoint={onAddPolygonPoint}
        />
      )}

      {zoomWithPrimary && zoomBox !== null && (
        <div
          key="zoomBox"
          style={{
            position: "absolute",
            zIndex: 1,
            border: "1px solid #fff",
            pointerEvents: "none",
            left: zoomBox.x,
            top: zoomBox.y,
            width: zoomBox.w,
            height: zoomBox.h,
          }}
        />
      )}

      <PreventScrollToParents
        style={{ width: "100%", height: "100%" }}
        {...mouseEvents}
      >
        <>
          {/* {fullImageSegmentationMode && (
            <ImageMask
              hide={!showMask}
              autoSegmentationOptions={autoSegmentationOptions}
              imagePosition={imagePosition}
              regionClsList={regionClsList}
              imageSrc={imageSrc}
              regions={regions}
            />
          )} */}
          <canvas
            style={{ opacity: 0.25 }}
            className={classes.canvas}
            ref={canvasEl}
          />
          <RegionShapes
            mat={mat}
            keypointDefinitions={keypointDefinitions}
            imagePosition={imagePosition}
            regions={regions}
            onRegionChange={onRegionChange}
            fullSegmentationMode={fullImageSegmentationMode}
          />
          <VideoOrImageCanvasBackground
            videoPlaying={videoPlaying}
            imagePosition={imagePosition}
            mouseEvents={mouseEvents}
            onLoad={onVideoOrImageLoaded}
            videoTime={videoTime}
            loader={loader}
            videoSrc={videoSrc}
            activeImage={activeImage}
            imageSrc={imageSrc}
            useCrossOrigin={fullImageSegmentationMode}
            onChangeVideoTime={onChangeVideoTime}
            onChangeVideoPlaying={onChangeVideoPlaying}
          />
        </>
      </PreventScrollToParents>
      <div className={classes.zoomIndicator}>
        {((1 / mat.a) * 100).toFixed(0)}%
      </div>
    </div>
  )
}

export default ImageCanvas
