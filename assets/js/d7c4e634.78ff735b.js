"use strict";(self.webpackChunkbuildbuddy_docs_website=self.webpackChunkbuildbuddy_docs_website||[]).push([[7365],{27448:(e,o,t)=>{t.r(o),t.d(o,{assets:()=>l,contentTitle:()=>a,default:()=>u,frontMatter:()=>r,metadata:()=>s,toc:()=>c});var n=t(85893),i=t(11151);const r={slug:"multiple-xcode-configurations-with-rules_xcodeproj-1-3",title:"Multiple Xcode Configurations with rules_xcodeproj 1.3",description:"The one where we added a much requested, but surprisingly difficult to implement, feature.",author:"Brentley Jones",author_title:"Developer Evangelist @ BuildBuddy",date:"2023-03-17:12:00:00",author_url:"https://brentleyjones.com",author_image_url:"https://avatars.githubusercontent.com/u/158658?v=4",image:"/img/rules_xcodeproj_1_3.png",tags:["rules_xcodeproj"]},a="The challenge",s={permalink:"/blog/multiple-xcode-configurations-with-rules_xcodeproj-1-3",editUrl:"https://github.com/buildbuddy-io/buildbuddy/edit/master/website/blog/multiple-xcode-configurations-with-rules_xcodeproj-1-3.md",source:"@site/blog/multiple-xcode-configurations-with-rules_xcodeproj-1-3.md",title:"Multiple Xcode Configurations with rules_xcodeproj 1.3",description:"The one where we added a much requested, but surprisingly difficult to implement, feature.",date:"2023-03-17T12:00:00.000Z",formattedDate:"March 17, 2023",tags:[{label:"rules_xcodeproj",permalink:"/blog/tags/rules-xcodeproj"}],readingTime:3.32,hasTruncateMarker:!0,authors:[{name:"Brentley Jones",title:"Developer Evangelist @ BuildBuddy",url:"https://brentleyjones.com",imageURL:"https://avatars.githubusercontent.com/u/158658?v=4"}],frontMatter:{slug:"multiple-xcode-configurations-with-rules_xcodeproj-1-3",title:"Multiple Xcode Configurations with rules_xcodeproj 1.3",description:"The one where we added a much requested, but surprisingly difficult to implement, feature.",author:"Brentley Jones",author_title:"Developer Evangelist @ BuildBuddy",date:"2023-03-17:12:00:00",author_url:"https://brentleyjones.com",author_image_url:"https://avatars.githubusercontent.com/u/158658?v=4",image:"/img/rules_xcodeproj_1_3.png",tags:["rules_xcodeproj"]},unlisted:!1,prevItem:{title:"Donating rules_xcodeproj to the Mobile Native Foundation",permalink:"/blog/donating-rules_xcodeproj-to-the-mobile-native-foundation"},nextItem:{title:"Introducing rules_xcodeproj 1.0",permalink:"/blog/introducing-rules_xcodeproj-1-0"}},l={authorsImageUrls:[void 0]},c=[];function d(e){const o={a:"a",code:"code",h1:"h1",p:"p",pre:"pre",...(0,i.a)(),...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsxs)(o.p,{children:["Today we released ",(0,n.jsx)(o.a,{href:"https://github.com/buildbuddy-io/rules_xcodeproj/releases/tag/1.3.2",children:"version 1.3.2"})," of rules_xcodeproj!"]}),"\n",(0,n.jsx)(o.p,{children:"This is a pretty exciting release, as it adds support for multiple Xcode\nconfigurations (e.g. Debug and Release). Since early in rules_xcodeproj\u2019s\ndevelopment, being able to have more than the default Debug configuration has\nbeen highly requested. We would have implemented support much sooner, but\nbecause rules_xcodeproj accounts for every file path and compiler/linker flag,\nin order to have rock solid indexing and debugging support, it wasn\u2019t an easy\ntask."}),"\n",(0,n.jsx)(o.p,{children:"rules_xcodeproj uses a Bazel aspect to collect all of the information about your\nbuild graph. It also uses Bazel split transitions in order to apply variations\nof certain flags in order to support simulator and device builds in a single\nproject. It seems that it should have been pretty easy to extend this method to\napply to Xcode configurations as well, right? There were two problems to being\nable to do that nicely, and we only really solved one of them at this time."}),"\n",(0,n.jsxs)(o.p,{children:["The common way that Bazel developers express various configurations is by\ndefining various configs in ",(0,n.jsx)(o.code,{children:".bazelrc"})," files, and then using the ",(0,n.jsx)(o.code,{children:"--config"}),"\nstanza to select them. So, that brings us to our first problem: Bazel\ntransitions can\u2019t transition on ",(0,n.jsx)(o.code,{children:"--config"}),". Because of our nested invocation\narchitecture, we are able to apply a single ",(0,n.jsx)(o.code,{children:"--config"})," to the inner invocation,\nand we\u2019ve had support for this for a while. Being able to transition on\n",(0,n.jsx)(o.code,{children:"--config"})," would have allowed us to support multiple Xcode configurations a lot\nsooner. Of note, in the solution we\u2019ve implemented, you still can\u2019t use\n",(0,n.jsx)(o.code,{children:"--config"}),", and need to list out all the flags you want for each configuration.\nThis is because of this limitation of transitions."]}),"\n",(0,n.jsxs)(o.p,{children:["For now we\u2019ve decided to continue to use transitions, and wanted to extend our\napproach to cover multiple configurations as well. That brought us to our second\nproblem: transitions are specified as part of a rule definition, and Bazel\nmacros can\u2019t create anonymous rule. The easy approach to this would have been to\nrequire users to define transitions in ",(0,n.jsx)(o.code,{children:".bzl"})," files (with the help of some\nmacros), and then reference them in their ",(0,n.jsx)(o.code,{children:"xcodeproj"})," targets (which are\nactually macros, not rules). This would go against one of our driving principles\nof only needing a single ",(0,n.jsx)(o.code,{children:"xcodeproj"})," target for all but the most complicated\nsetups, as we believe Xcode configurations are a fundamental aspect of projects\nthat everyone should be able to easily specify."]}),"\n",(0,n.jsx)(o.h1,{id:"the-solution",children:"The solution"}),"\n",(0,n.jsxs)(o.p,{children:["The solution we implemented allows you to specify a dictionary of transition\nsettings in the ",(0,n.jsx)(o.code,{children:"xcodeproj.xcode_configurations"})," attribute. Given the\npreviously mentioned limitations, you may be wondering how we were able to\naccomplish this. Earlier I mentioned our nested invocation architecture, which\ncalls ",(0,n.jsx)(o.code,{children:"bazel run"})," in ",(0,n.jsx)(o.code,{children:"runner.sh"})," (the script that is invoked when you call\n",(0,n.jsx)(o.code,{children:"bazel run //:xcodeproj"}),"). We leverage this architecture to generate a Bazel\npackage in an external repository. This package contains a ",(0,n.jsx)(o.code,{children:"BUILD"})," file with a\ntarget using the actual ",(0,n.jsx)(o.code,{children:"xcodeproj"})," rule, along with a ",(0,n.jsx)(o.code,{children:".bzl"})," file that defines\na custom transition containing information from\n",(0,n.jsx)(o.code,{children:"xcodeproj.xcode_configurations"}),". And just like how a solution for a previous\nfeature was built upon to enable another feature (i.e. nested invocations which\nenabled isolated build configurations, was built on for generated packages to\nenable multiple Xcode configurations), we should be able to build on this\nsolution the same way (e.g. to enable automatic target discovery)."]}),"\n",(0,n.jsx)(o.p,{children:"Here is an example of how you could specify Debug and Release configurations:"}),"\n",(0,n.jsx)(o.pre,{children:(0,n.jsx)(o.code,{className:"language-python",children:'xcodeproj(\n    ...\n    xcode_configurations = {\n        "Debug": {\n            "//command_line_option:compilation_mode": "dbg",\n        },\n        "Release": {\n            "//command_line_option:compilation_mode": "opt",\n        },\n    },\n    ...\n)\n'})}),"\n",(0,n.jsxs)(o.p,{children:["We think the end result is a good starting point, but can be refined futher in\nfuture releases. Please give it a try, and if you run into any problems\n",(0,n.jsx)(o.a,{href:"https://github.com/buildbuddy-io/rules_xcodeproj/issues/new/choose",children:"file an issue"}),"! You can also join us in the ",(0,n.jsx)(o.code,{children:"#rules_xcodeproj"}),"\nchannel in the ",(0,n.jsx)(o.a,{href:"https://slack.bazel.build/",children:"Bazel Slack workspace"}),", and you can email us at\n",(0,n.jsx)(o.a,{href:"mailto:hello@buildbuddy.io",children:"hello@buildbuddy.io"})," with any questions, comments, or thoughts."]})]})}function u(e={}){const{wrapper:o}={...(0,i.a)(),...e.components};return o?(0,n.jsx)(o,{...e,children:(0,n.jsx)(d,{...e})}):d(e)}},11151:(e,o,t)=>{t.d(o,{Z:()=>s,a:()=>a});var n=t(67294);const i={},r=n.createContext(i);function a(e){const o=n.useContext(r);return n.useMemo((function(){return"function"==typeof e?e(o):{...o,...e}}),[o,e])}function s(e){let o;return o=e.disableParentContext?"function"==typeof e.components?e.components(i):e.components||i:a(e.components),n.createElement(r.Provider,{value:o},e.children)}}}]);