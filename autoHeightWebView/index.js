'use strict';

import React, { useState, useEffect, forwardRef } from 'react';

import { StyleSheet, Platform, ViewPropTypes } from 'react-native';

import PropTypes from 'prop-types';

import { WebView } from 'react-native-webview';

import { reduceData, getWidth, isSizeChanged, shouldUpdate } from './utils';

function useCombinedRefs(...refs) {
  const targetRef = React.useRef()

  React.useEffect(() => {
    refs.forEach(ref => {
      if (!ref) return

      if (typeof ref === 'function') {
        ref(targetRef.current)
      } else {
        ref.current = targetRef.current
      }
    })
  }, [refs])

  return targetRef
}

const AutoHeightWebView = React.memo(
  forwardRef((props, ref) => {
    const { style, onMessage, onSizeUpdated, scrollEnabledWithZoomedin, scrollEnabled, initialHeight } = props;
    // const innerRef = React.useRef(ref);
    const innerRef = React.useRef(null)
    const combinedRef = useCombinedRefs(ref, innerRef)

    const [size, setSize] = useState({
      height: style && style.height ? style.height : initialHeight,
      width: getWidth(style)
    });
    const [scrollable, setScrollable] = useState(false);
    const handleMessage = event => {
      onMessage && onMessage(event);
      if (!event.nativeEvent) {
        return;
      }
      let data = {};
      // Sometimes the message is invalid JSON, so we ignore that case
      try {
        data = JSON.parse(event.nativeEvent.data);
      } catch (error) {
        console.error(error);
        return;
      }
      const { height, width, zoomedin } = data;
      !scrollEnabled && scrollEnabledWithZoomedin && setScrollable(!!zoomedin);
      const { height: previousHeight, width: previousWidth } = size;
      isSizeChanged({ height, previousHeight, width, previousWidth }) &&
      setSize({
        height,
        width
      });
    };

    const currentScrollEnabled = scrollEnabled === false && scrollEnabledWithZoomedin ? scrollable : scrollEnabled;

    const { currentSource, script } = reduceData(props);

    const { width, height } = size;
    useEffect(
      () =>
        onSizeUpdated &&
        onSizeUpdated({
          height,
          width
        }),
      [width, height, onSizeUpdated]
    );

    return (
      <WebView
        {...props}
        ref={combinedRef}
        onMessage={handleMessage}
        style={[
          styles.webView,
          {
            width,
            height
          },
          style
        ]}
        source={currentSource}
        onLoadProgress={({ nativeEvent }) => {
          console.log(nativeEvent.progress);
          if (nativeEvent.progress > 0.5 && combinedRef.current) {
            console.log('更新autoheight-webview高度');
            combinedRef.current.injectJavaScript(script);
          }
          if (props.onLoadProgress) {
            props.onLoadProgress({ nativeEvent })
          }
        }}
        scrollEnabled={currentScrollEnabled}
      />
    );
  }),
  (prevProps, nextProps) => !shouldUpdate({ prevProps, nextProps })
);

AutoHeightWebView.propTypes = {
  onSizeUpdated: PropTypes.func,
  files: PropTypes.arrayOf(
    PropTypes.shape({
      href: PropTypes.string,
      type: PropTypes.string,
      rel: PropTypes.string
    })
  ),
  style: ViewPropTypes.style,
  customScript: PropTypes.string,
  customStyle: PropTypes.string,
  viewportContent: PropTypes.string,
  scrollEnabledWithZoomedin: PropTypes.bool,
  initialHeight: PropTypes.number,
  // webview props
  originWhitelist: PropTypes.arrayOf(PropTypes.string),
  onMessage: PropTypes.func,
  scalesPageToFit: PropTypes.bool,
  source: PropTypes.object
};

let defaultProps = {
  showsVerticalScrollIndicator: false,
  showsHorizontalScrollIndicator: false,
  initialHeight: 0,
  originWhitelist: ['*']
};

Platform.OS === 'android' &&
Object.assign(defaultProps, {
  scalesPageToFit: false
});

Platform.OS === 'ios' &&
Object.assign(defaultProps, {
  viewportContent: 'width=device-width'
});

AutoHeightWebView.defaultProps = defaultProps;

const styles = StyleSheet.create({
  webView: {
    backgroundColor: 'transparent'
  }
});

export default AutoHeightWebView;
